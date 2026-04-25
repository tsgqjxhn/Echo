package com.echo.app.plugins;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {

    private static final String STT_RESULT_EVENT = "sttResult";
    private static final String STT_STATE_EVENT = "sttState";
    private static final String STT_ERROR_EVENT = "sttError";
    private static final String TTS_STATE_EVENT = "ttsState";
    private static final String TTS_ERROR_EVENT = "ttsError";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private boolean stopRequested = false;
    private PluginCall pendingStopCall;
    private Runnable pendingStopFallback;
    private String latestTranscript = "";
    private String latestPartialTranscript = "";

    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
    private boolean ttsInitializing = false;
    private PluginCall pendingSpeakCall;
    private JSObject pendingSpeakOptions;

    @Override
    public void load() {
        super.load();
        ensureTextToSpeech();
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sttAvailable", SpeechRecognizer.isRecognitionAvailable(getContext()));
        result.put("ttsAvailable", textToSpeech != null || ttsReady || ttsInitializing);
        call.resolve(result);
    }

    @PluginMethod
    public void startRecognition(PluginCall call) {
        final String language = call.getString("language", "zh-CN");
        final boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", true));

        runOnMainThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("当前设备不支持系统语音识别");
                return;
            }

            cancelRecognitionInternal(false);
            clearRecognitionText();
            stopRequested = false;

            try {
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                speechRecognizer.setRecognitionListener(buildRecognitionListener());

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

                isListening = true;
                emitState(STT_STATE_EVENT, "listening", null);
                speechRecognizer.startListening(intent);

                JSObject result = new JSObject();
                result.put("started", true);
                call.resolve(result);
            } catch (Exception error) {
                releaseSpeechRecognizer();
                call.reject(error.getMessage() != null ? error.getMessage() : "启动系统语音识别失败");
            }
        });
    }

    @PluginMethod
    public void stopRecognition(PluginCall call) {
        runOnMainThread(() -> {
            if (speechRecognizer == null || !isListening) {
                JSObject result = new JSObject();
                result.put("text", bestTranscript());
                call.resolve(result);
                return;
            }

            if (pendingStopCall != null) {
                pendingStopCall.resolve(new JSObject().put("text", bestTranscript()));
            }

            pendingStopCall = call;
            stopRequested = true;

            scheduleStopFallback();

            try {
                speechRecognizer.stopListening();
            } catch (Exception error) {
                resolveStopCall(bestTranscript());
            }
        });
    }

    @PluginMethod
    public void cancelRecognition(PluginCall call) {
        runOnMainThread(() -> {
            cancelRecognitionInternal(true);
            call.resolve();
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("text is required");
            return;
        }

        final JSObject options = new JSObject();
        options.put("text", text);
        options.put("rate", call.getDouble("rate", 1D));
        options.put("pitch", call.getDouble("pitch", 1D));
        options.put("volume", call.getDouble("volume", 1D));
        options.put("language", call.getString("language", "zh-CN"));
        options.put("voice", call.getString("voice", ""));

        runOnMainThread(() -> {
            if (ttsReady && textToSpeech != null) {
                startSpeaking(call, options);
                return;
            }

            pendingSpeakCall = call;
            pendingSpeakOptions = options;
            ensureTextToSpeech();
        });
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        runOnMainThread(() -> {
            if (textToSpeech != null) {
                textToSpeech.stop();
            }
            emitState(TTS_STATE_EVENT, "stopped", null);
            call.resolve();
        });
    }

    @PluginMethod
    public void getVoices(PluginCall call) {
        runOnMainThread(() -> {
            JSObject result = new JSObject();
            ArrayList<JSObject> voices = new ArrayList<>();

            if (textToSpeech != null && ttsReady && textToSpeech.getVoices() != null) {
                for (Voice voice : textToSpeech.getVoices()) {
                    if (voice == null || voice.getName() == null) {
                        continue;
                    }

                    Locale locale = voice.getLocale();
                    JSObject item = new JSObject();
                    item.put("name", voice.getName());
                    item.put("lang", locale != null ? locale.toLanguageTag() : "");
                    voices.add(item);
                }
            }

            result.put("voices", voices);
            call.resolve(result);
        });
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        runOnMainThread(() -> {
            cancelRecognitionInternal(false);
            releaseTextToSpeech();
        });
    }

    private void ensureTextToSpeech() {
        if (textToSpeech != null || ttsInitializing) {
            return;
        }

        ttsInitializing = true;
        textToSpeech = new TextToSpeech(getContext(), status -> {
            ttsInitializing = false;
            ttsReady = status == TextToSpeech.SUCCESS;

            if (!ttsReady || textToSpeech == null) {
                rejectPendingSpeak("当前设备不支持系统语音朗读");
                releaseTextToSpeech();
                return;
            }

            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    emitState(TTS_STATE_EVENT, "playing", utteranceId);
                }

                @Override
                public void onDone(String utteranceId) {
                    emitState(TTS_STATE_EVENT, "done", utteranceId);
                }

                @Override
                public void onError(String utteranceId) {
                    emitError(TTS_ERROR_EVENT, "系统语音朗读失败", "tts_error", utteranceId);
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    emitError(TTS_ERROR_EVENT, "系统语音朗读失败", String.valueOf(errorCode), utteranceId);
                }
            });

            if (pendingSpeakCall != null && pendingSpeakOptions != null) {
                startSpeaking(pendingSpeakCall, pendingSpeakOptions);
                pendingSpeakCall = null;
                pendingSpeakOptions = null;
            }
        });
    }

    private void startSpeaking(PluginCall call, JSObject options) {
        if (textToSpeech == null || !ttsReady) {
            call.reject("系统语音朗读尚未准备好");
            return;
        }

        final String text = options.getString("text", "");
        final double rate = options.optDouble("rate", 1D);
        final double pitch = options.optDouble("pitch", 1D);
        final double volume = options.optDouble("volume", 1D);
        final String language = options.getString("language", "zh-CN");
        final String voiceName = options.getString("voice", "");
        final String utteranceId = UUID.randomUUID().toString();

        Locale locale = resolveLocale(language);
        int languageStatus = textToSpeech.setLanguage(locale);
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
            textToSpeech.setLanguage(Locale.SIMPLIFIED_CHINESE);
        }

        if (voiceName != null && !voiceName.trim().isEmpty() && textToSpeech.getVoices() != null) {
            for (Voice voice : textToSpeech.getVoices()) {
                if (voice != null && voiceName.equals(voice.getName())) {
                    textToSpeech.setVoice(voice);
                    break;
                }
            }
        }

        textToSpeech.setSpeechRate((float) Math.max(0.1D, Math.min(3D, rate)));
        textToSpeech.setPitch((float) Math.max(0.1D, Math.min(2D, pitch)));

        Bundle params = new Bundle();
        params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, (float) Math.max(0D, Math.min(1D, volume)));

        int speakStatus = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);
        if (speakStatus == TextToSpeech.ERROR) {
            call.reject("系统语音朗读启动失败");
            return;
        }

        JSObject result = new JSObject();
        result.put("utteranceId", utteranceId);
        call.resolve(result);
    }

    private RecognitionListener buildRecognitionListener() {
        return new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                emitState(STT_STATE_EVENT, "ready", null);
            }

            @Override
            public void onBeginningOfSpeech() {
                emitState(STT_STATE_EVENT, "recording", null);
            }

            @Override
            public void onRmsChanged(float rmsdB) {
            }

            @Override
            public void onBufferReceived(byte[] buffer) {
            }

            @Override
            public void onEndOfSpeech() {
                emitState(STT_STATE_EVENT, "processing", null);
            }

            @Override
            public void onError(int error) {
                String code = String.valueOf(error);
                String message = mapRecognitionError(error);

                if (stopRequested && (
                    error == SpeechRecognizer.ERROR_CLIENT
                    || error == SpeechRecognizer.ERROR_NO_MATCH
                    || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                )) {
                    resolveStopCall(bestTranscript());
                    return;
                }

                emitError(STT_ERROR_EVENT, message, code, null);
                resolveStopCall(bestTranscript());
            }

            @Override
            public void onResults(Bundle results) {
                String text = extractBestMatch(results);
                if (!text.isEmpty()) {
                    latestTranscript = text;
                    emitSTTResult(text, true);
                }
                resolveStopCall(bestTranscript());
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                String text = extractBestMatch(partialResults);
                if (text.isEmpty()) {
                    return;
                }

                latestPartialTranscript = text;
                emitSTTResult(text, false);
            }

            @Override
            public void onEvent(int eventType, Bundle params) {
            }
        };
    }

    private void scheduleStopFallback() {
        cancelStopFallback();
        pendingStopFallback = () -> resolveStopCall(bestTranscript());
        mainHandler.postDelayed(pendingStopFallback, 2500);
    }

    private void cancelStopFallback() {
        if (pendingStopFallback != null) {
            mainHandler.removeCallbacks(pendingStopFallback);
            pendingStopFallback = null;
        }
    }

    private void resolveStopCall(String text) {
        cancelStopFallback();
        isListening = false;
        stopRequested = false;

        PluginCall stopCall = pendingStopCall;
        pendingStopCall = null;

        emitState(STT_STATE_EVENT, "idle", null);
        releaseSpeechRecognizer();

        if (stopCall != null) {
            JSObject result = new JSObject();
            result.put("text", text != null ? text : "");
            stopCall.resolve(result);
        }
    }

    private void cancelRecognitionInternal(boolean emitStoppedState) {
        cancelStopFallback();
        stopRequested = false;
        isListening = false;

        if (speechRecognizer != null) {
            try {
                speechRecognizer.cancel();
            } catch (Exception ignored) {
            }
        }

        PluginCall stopCall = pendingStopCall;
        pendingStopCall = null;
        if (stopCall != null) {
            stopCall.resolve(new JSObject().put("text", bestTranscript()));
        }

        releaseSpeechRecognizer();

        if (emitStoppedState) {
            emitState(STT_STATE_EVENT, "idle", null);
        }
    }

    private void releaseSpeechRecognizer() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception ignored) {
            }
            speechRecognizer = null;
        }
    }

    private void releaseTextToSpeech() {
        if (textToSpeech != null) {
            try {
                textToSpeech.stop();
                textToSpeech.shutdown();
            } catch (Exception ignored) {
            }
            textToSpeech = null;
        }

        ttsReady = false;
        ttsInitializing = false;
    }

    private void rejectPendingSpeak(String message) {
        if (pendingSpeakCall != null) {
            pendingSpeakCall.reject(message);
            pendingSpeakCall = null;
        }
        pendingSpeakOptions = null;
    }

    private void clearRecognitionText() {
        latestTranscript = "";
        latestPartialTranscript = "";
    }

    private String bestTranscript() {
        if (latestTranscript != null && !latestTranscript.trim().isEmpty()) {
            return latestTranscript.trim();
        }

        if (latestPartialTranscript != null && !latestPartialTranscript.trim().isEmpty()) {
            return latestPartialTranscript.trim();
        }

        return "";
    }

    private String extractBestMatch(Bundle bundle) {
        if (bundle == null) {
            return "";
        }

        ArrayList<String> matches = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty()) {
            return "";
        }

        String match = matches.get(0);
        return match != null ? match.trim() : "";
    }

    private Locale resolveLocale(String languageTag) {
        if (languageTag == null || languageTag.trim().isEmpty()) {
            return Locale.SIMPLIFIED_CHINESE;
        }

        try {
            return Locale.forLanguageTag(languageTag);
        } catch (Exception ignored) {
            return Locale.SIMPLIFIED_CHINESE;
        }
    }

    private String mapRecognitionError(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "录音输入异常";
            case SpeechRecognizer.ERROR_CLIENT:
                return "系统语音识别被中断";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "麦克风权限不足";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "系统语音识别网络异常";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "没有识别到可用语音";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "系统语音识别正忙";
            case SpeechRecognizer.ERROR_SERVER:
                return "系统语音识别服务异常";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "长时间未检测到说话";
            default:
                return "系统语音识别失败";
        }
    }

    private void emitSTTResult(String text, boolean isFinal) {
        JSObject event = new JSObject();
        event.put("text", text);
        event.put("final", isFinal);
        emitEvent(STT_RESULT_EVENT, event);
    }

    private void emitState(String eventName, String state, String utteranceId) {
        JSObject event = new JSObject();
        event.put("state", state);
        if (utteranceId != null) {
            event.put("utteranceId", utteranceId);
        }
        emitEvent(eventName, event);
    }

    private void emitError(String eventName, String message, String code, String utteranceId) {
        JSObject event = new JSObject();
        event.put("message", message != null ? message : "");
        if (code != null) {
            event.put("code", code);
        }
        if (utteranceId != null) {
            event.put("utteranceId", utteranceId);
        }
        emitEvent(eventName, event);
    }

    private void emitEvent(String eventName, JSObject payload) {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        bridge.executeOnMainThread(() -> notifyListeners(eventName, payload));
    }

    private void runOnMainThread(Runnable action) {
        Bridge bridge = getBridge();
        if (bridge == null) {
            return;
        }

        bridge.executeOnMainThread(action);
    }
}
