package com.echo.app.plugins;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@CapacitorPlugin(name = "NativeChatStream")
public class NativeChatStreamPlugin extends Plugin {

    private static final String EVENT_NAME = "streamEvent";
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final Map<String, StreamTask> activeStreams = new ConcurrentHashMap<>();

    @PluginMethod
    public void start(final PluginCall call) {
        final String requestId = call.getString("requestId");
        final String url = call.getString("url");
        final String method = normalizeMethod(call.getString("method", "POST"));
        final JSObject headers = call.getObject("headers", new JSObject());
        final String body = call.getString("body");
        final Integer connectTimeout = call.getInt("connectTimeout", 30000);
        final Integer readTimeout = call.getInt("readTimeout", 300000);

        if (requestId == null || requestId.trim().isEmpty()) {
            call.reject("requestId is required");
            return;
        }

        if (url == null || url.trim().isEmpty()) {
            call.reject("url is required");
            return;
        }

        StreamTask previousTask = activeStreams.remove(requestId);
        if (previousTask != null) {
            previousTask.cancel();
        }

        final StreamTask task = new StreamTask();
        activeStreams.put(requestId, task);

        try {
            task.future = executor.submit(() -> runStream(task, requestId, url, method, headers, body, connectTimeout, readTimeout));
            call.resolve(new JSObject().put("requestId", requestId));
        } catch (Exception error) {
            activeStreams.remove(requestId, task);
            task.cancel();
            call.reject(error.getMessage() != null ? error.getMessage() : "Failed to start native stream", error);
        }
    }

    @PluginMethod
    public void abort(final PluginCall call) {
        final String requestId = call.getString("requestId");
        if (requestId == null || requestId.trim().isEmpty()) {
            call.reject("requestId is required");
            return;
        }

        StreamTask task = activeStreams.remove(requestId);
        if (task != null) {
            task.cancel();
        }

        call.resolve(new JSObject().put("requestId", requestId).put("aborted", true));
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();

        for (StreamTask task : activeStreams.values()) {
            task.cancel();
        }

        activeStreams.clear();
        executor.shutdownNow();
    }

    private void runStream(
        StreamTask task,
        String requestId,
        String urlString,
        String method,
        JSObject headers,
        String body,
        Integer connectTimeout,
        Integer readTimeout
    ) {
        HttpURLConnection connection = null;

        try {
            connection = (HttpURLConnection) new URL(urlString).openConnection();
            task.connection = connection;
            connection.setRequestMethod(method);
            connection.setConnectTimeout(Math.max(connectTimeout != null ? connectTimeout : 0, 0));
            connection.setReadTimeout(Math.max(readTimeout != null ? readTimeout : 0, 0));
            connection.setDoInput(true);
            connection.setUseCaches(false);

            applyHeaders(connection, headers);
            writeRequestBody(connection, method, body);

            final int status = connection.getResponseCode();
            emitOpen(requestId, status, connection.getHeaderField("Content-Type"));

            if (status < 200 || status >= 300) {
                emitError(
                    requestId,
                    status,
                    readStreamAsString(connection.getErrorStream()),
                    "HTTP " + status
                );
                return;
            }

            InputStream inputStream = connection.getInputStream();
            if (inputStream == null) {
                emitError(requestId, 502, null, "Provider returned an empty response body.");
                return;
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                String line;
                while (!task.cancelled && (line = reader.readLine()) != null) {
                    emitChunk(requestId, line + "\n");
                }
            }

            if (!task.cancelled) {
                emitComplete(requestId);
            }
        } catch (SocketTimeoutException error) {
            if (!task.cancelled) {
                emitError(requestId, null, null, error.getMessage() != null ? error.getMessage() : "Native stream request timed out.");
            }
        } catch (Exception error) {
            if (!task.cancelled) {
                emitError(requestId, null, null, error.getMessage() != null ? error.getMessage() : "Native stream request failed.");
            }
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
            task.connection = null;
            activeStreams.remove(requestId, task);
        }
    }

    private void applyHeaders(HttpURLConnection connection, JSObject headers) {
        if (headers == null) {
            return;
        }

        Iterator<String> iterator = headers.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            String value = headers.getString(key);
            if (value != null) {
                connection.setRequestProperty(key, value);
            }
        }
    }

    private void writeRequestBody(HttpURLConnection connection, String method, String body) throws IOException {
        if (body == null || body.isEmpty() || !allowsRequestBody(method)) {
            return;
        }

        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        connection.setDoOutput(true);
        connection.setFixedLengthStreamingMode(payload.length);

        try (OutputStream outputStream = connection.getOutputStream()) {
            outputStream.write(payload);
            outputStream.flush();
        }
    }

    private boolean allowsRequestBody(String method) {
        return !"GET".equals(method) && !"HEAD".equals(method);
    }

    private String readStreamAsString(InputStream stream) throws IOException {
        if (stream == null) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            boolean firstLine = true;
            while ((line = reader.readLine()) != null) {
                if (!firstLine) {
                    builder.append('\n');
                }
                builder.append(line);
                firstLine = false;
            }
        }

        return builder.toString();
    }

    private String normalizeMethod(String method) {
        if (method == null || method.trim().isEmpty()) {
            return "POST";
        }

        return method.trim().toUpperCase(Locale.US);
    }

    private void emitOpen(String requestId, int status, String contentType) {
        JSObject event = new JSObject()
            .put("requestId", requestId)
            .put("type", "open")
            .put("status", status);

        if (contentType != null && !contentType.isEmpty()) {
            event.put("contentType", contentType);
        }

        emitEvent(event);
    }

    private void emitChunk(String requestId, String chunk) {
        emitEvent(
            new JSObject()
                .put("requestId", requestId)
                .put("type", "chunk")
                .put("chunk", chunk)
        );
    }

    private void emitComplete(String requestId) {
        emitEvent(
            new JSObject()
                .put("requestId", requestId)
                .put("type", "complete")
        );
    }

    private void emitError(String requestId, Integer status, String body, String message) {
        JSObject event = new JSObject()
            .put("requestId", requestId)
            .put("type", "error");

        if (status != null) {
            event.put("status", status.intValue());
        }

        if (body != null && !body.isEmpty()) {
            event.put("body", body);
        }

        if (message != null && !message.isEmpty()) {
            event.put("message", message);
        }

        emitEvent(event);
    }

    private void emitEvent(JSObject event) {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        bridge.executeOnMainThread(() -> notifyListeners(EVENT_NAME, event));
    }

    private static final class StreamTask {
        volatile boolean cancelled;
        volatile HttpURLConnection connection;
        volatile Future<?> future;

        void cancel() {
            cancelled = true;

            HttpURLConnection activeConnection = connection;
            if (activeConnection != null) {
                activeConnection.disconnect();
            }

            Future<?> activeFuture = future;
            if (activeFuture != null) {
                activeFuture.cancel(true);
            }
        }
    }
}
