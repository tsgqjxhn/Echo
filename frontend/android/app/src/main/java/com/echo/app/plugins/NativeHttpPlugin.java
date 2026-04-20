package com.echo.app.plugins;

import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeHttp")
public class NativeHttpPlugin extends Plugin {

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PluginMethod
    public void request(final PluginCall call) {
        executor.submit(() -> {
            HttpURLConnection connection = null;

            try {
                String url = call.getString("url");
                String method = normalizeMethod(call.getString("method", "GET"));
                JSObject headers = call.getObject("headers", new JSObject());
                String data = call.getString("data");
                String responseType = normalizeResponseType(call.getString("responseType", "json"));
                Integer connectTimeout = call.getInt("connectTimeout", 30000);
                Integer readTimeout = call.getInt("readTimeout", 30000);

                if (url == null || url.trim().isEmpty()) {
                    call.reject("url is required");
                    return;
                }

                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setRequestMethod(method);
                connection.setConnectTimeout(Math.max(connectTimeout != null ? connectTimeout : 0, 0));
                connection.setReadTimeout(Math.max(readTimeout != null ? readTimeout : 0, 0));
                connection.setUseCaches(false);
                connection.setInstanceFollowRedirects(true);
                connection.setDoInput(true);

                applyHeaders(connection, headers);
                writeRequestBody(connection, method, data);

                int status = connection.getResponseCode();
                byte[] responseBytes = readResponseBytes(connection, status);

                JSObject result = new JSObject()
                    .put("status", status)
                    .put("url", connection.getURL().toString())
                    .put("headers", buildHeaders(connection));

                if ("blob".equals(responseType)) {
                    result.put("data", Base64.encodeToString(responseBytes, Base64.NO_WRAP));
                } else {
                    result.put("data", new String(responseBytes, StandardCharsets.UTF_8));
                }

                call.resolve(result);
            } catch (Exception error) {
                call.reject(error.getMessage() != null ? error.getMessage() : "Native HTTP request failed.", error);
            } finally {
                if (connection != null) {
                    connection.disconnect();
                }
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        executor.shutdownNow();
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

    private void writeRequestBody(HttpURLConnection connection, String method, String data) throws IOException {
        if (data == null || data.isEmpty() || !allowsRequestBody(method)) {
            return;
        }

        byte[] payload = data.getBytes(StandardCharsets.UTF_8);
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

    private byte[] readResponseBytes(HttpURLConnection connection, int status) throws IOException {
        InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
        if (stream == null) {
            return new byte[0];
        }

        try (InputStream inputStream = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private JSObject buildHeaders(HttpURLConnection connection) {
        JSObject headers = new JSObject();

        for (Map.Entry<String, List<String>> entry : connection.getHeaderFields().entrySet()) {
            String key = entry.getKey();
            List<String> values = entry.getValue();
            if (key == null || values == null || values.isEmpty()) {
                continue;
            }

            headers.put(key, String.join(", ", values));
        }

        return headers;
    }

    private String normalizeMethod(String method) {
        if (method == null || method.trim().isEmpty()) {
            return "GET";
        }

        return method.trim().toUpperCase(Locale.US);
    }

    private String normalizeResponseType(String responseType) {
        if (responseType == null || responseType.trim().isEmpty()) {
            return "json";
        }

        return responseType.trim().toLowerCase(Locale.US);
    }
}
