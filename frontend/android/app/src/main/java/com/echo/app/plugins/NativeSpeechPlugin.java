package com.echo.app.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.k2fsa.sherpa.ncnn.SherpaNcnn;
import com.k2fsa.sherpa.ncnn.RecognizerConfig;
import com.k2fsa.sherpa.ncnn.FeatureExtractorConfig;
import com.k2fsa.sherpa.ncnn.ModelConfig;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "NativeSpeech")
public class NativeSpeechPlugin extends Plugin {

    private static final String STT_RESULT_EVENT = "sttResult";
    private static final String STT_STATE_EVENT = "sttState";
    private static final String STT_ERROR_EVENT = "sttError";
    private static final String TTS_STATE_EVENT = "ttsState";
    private static final String TTS_ERROR_EVENT = "ttsError";

    private static final int SAMPLE_RATE = 16000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    // System speech recognizer
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private boolean stopRequested = false;
    private PluginCall pendingStopCall;
    private Runnable pendingStopFallback;
    private long recognitionStartTime = 0L;
    private static final long MIN_RECOGNITION_DURATION_MS = 800L;
    private String latestTranscript = "";
    private String latestPartialTranscript = "";

    // Audio recording
    private MediaRecorder audioRecorder;
    private File audioRecordFile;

    // TTS
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
    private boolean ttsInitializing = false;
    private PluginCall pendingSpeakCall;
    private JSObject pendingSpeakOptions;

    // sherpa-ncnn local STT
    private SherpaNcnn sherpaRecognizer;
    private Thread sherpaThread;
    private AudioRecord sherpaAudioRecord;
    private final AtomicBoolean sherpaRunning = new AtomicBoolean(false);
    private boolean useSherpaNcnn = false;

    @Override
    public void load() {
        super.load();
        ensureTextToSpeech();
    }

    @PluginMethod
    public void checkAvailability(PluginCall call) {
        JSObject result = new JSObject();
        boolean systemStt = SpeechRecognizer.isRecognitionAvailable(getContext());
        boolean sherpaReady = isSherpaModelReady();
        result.put("sttAvailable", systemStt || sherpaReady);
        result.put("ttsAvailable", textToSpeech != null || ttsReady || ttsInitializing);
        result.put("recordPermission", hasRecordPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void startRecognition(PluginCall call) {
        final String language = call.getString("language", "zh-CN");
        final boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", false));

        runOnMainThread(() -> {
            if (!hasRecordPermission()) {
                call.reject("缺少麦克风权限 (RECORD_AUDIO)");
                return;
            }

            boolean systemSttAvailable = SpeechRecognizer.isRecognitionAvailable(getContext());

            // Use sherpa-ncnn when preferOffline or system STT unavailable
            if (preferOffline || !systemSttAvailable) {
                if (!isSherpaModelReady()) {
                    call.reject("本地语音模型未就绪");
                    return;
                }
                startSherpaRecognition(call, language);
                return;
            }

            // Fallback to system speech recognizer
            startSystemRecognition(call, language);
        });
    }

    @PluginMethod
    public void downloadRecognitionModel(PluginCall call) {
        runOnMainThread(() -> {
            call.resolve(new JSObject().put("triggered", true));
        });
    }

    @PluginMethod
    public void stopRecognition(PluginCall call) {
        runOnMainThread(() -> {
            if (useSherpaNcnn) {
                stopSherpaRecognition(call);
                return;
            }
            stopSystemRecognition(call);
        });
    }

    @PluginMethod
    public void cancelRecognition(PluginCall call) {
        runOnMainThread(() -> {
            if (useSherpaNcnn) {
                cancelSherpaRecognition();
                call.resolve();
                return;
            }
            cancelRecognitionInternal(true);
            call.resolve();
        });
    }

    // ==================== sherpa-ncnn Local STT ====================

    private boolean isSherpaModelReady() {
        try {
            String[] files = {
                "sherpa-ncnn/encoder_jit_trace-pnnx.ncnn.param",
                "sherpa-ncnn/encoder_jit_trace-pnnx.ncnn.bin",
                "sherpa-ncnn/decoder_jit_trace-pnnx.ncnn.param",
                "sherpa-ncnn/decoder_jit_trace-pnnx.ncnn.bin",
                "sherpa-ncnn/joiner_jit_trace-pnnx.ncnn.param",
                "sherpa-ncnn/joiner_jit_trace-pnnx.ncnn.bin",
                "sherpa-ncnn/tokens.txt"
            };
            for (String name : files) {
                getContext().getAssets().open(name).close();
            }
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private void startSherpaRecognition(PluginCall call, String language) {
        cancelRecognitionInternal(false);
        clearRecognitionText();
        stopRequested = false;

        try {
            // Copy model files from assets to internal storage
            File modelDir = new File(getContext().getFilesDir(), "sherpa-ncnn-model");
            if (!modelDir.exists()) {
                modelDir.mkdirs();
            }
            copyAssetIfNeeded("sherpa-ncnn/encoder_jit_trace-pnnx.ncnn.param", new File(modelDir, "encoder_jit_trace-pnnx.ncnn.param"));
            copyAssetIfNeeded("sherpa-ncnn/encoder_jit_trace-pnnx.ncnn.bin", new File(modelDir, "encoder_jit_trace-pnnx.ncnn.bin"));
            copyAssetIfNeeded("sherpa-ncnn/decoder_jit_trace-pnnx.ncnn.param", new File(modelDir, "decoder_jit_trace-pnnx.ncnn.param"));
            copyAssetIfNeeded("sherpa-ncnn/decoder_jit_trace-pnnx.ncnn.bin", new File(modelDir, "decoder_jit_trace-pnnx.ncnn.bin"));
            copyAssetIfNeeded("sherpa-ncnn/joiner_jit_trace-pnnx.ncnn.param", new File(modelDir, "joiner_jit_trace-pnnx.ncnn.param"));
            copyAssetIfNeeded("sherpa-ncnn/joiner_jit_trace-pnnx.ncnn.bin", new File(modelDir, "joiner_jit_trace-pnnx.ncnn.bin"));
            copyAssetIfNeeded("sherpa-ncnn/tokens.txt", new File(modelDir, "tokens.txt"));

            // Build recognizer config
            RecognizerConfig config = new RecognizerConfig();
            config.featConfig.sampleRate = 16000.0f;
            config.featConfig.featureDim = 80;

            config.modelConfig.encoderParam = new File(modelDir, "encoder_jit_trace-pnnx.ncnn.param").getAbsolutePath();
            config.modelConfig.encoderBin = new File(modelDir, "encoder_jit_trace-pnnx.ncnn.bin").getAbsolutePath();
            config.modelConfig.decoderParam = new File(modelDir, "decoder_jit_trace-pnnx.ncnn.param").getAbsolutePath();
            config.modelConfig.decoderBin = new File(modelDir, "decoder_jit_trace-pnnx.ncnn.bin").getAbsolutePath();
            config.modelConfig.joinerParam = new File(modelDir, "joiner_jit_trace-pnnx.ncnn.param").getAbsolutePath();
            config.modelConfig.joinerBin = new File(modelDir, "joiner_jit_trace-pnnx.ncnn.bin").getAbsolutePath();
            config.modelConfig.tokens = new File(modelDir, "tokens.txt").getAbsolutePath();
            config.modelConfig.numThreads = 4;
            config.modelConfig.useGPU = false;

            config.enableEndpoint = true;
            config.rule1MinTrailingSilence = 2.4f;
            config.rule2MinTrailingSilence = 1.2f;
            config.rule3MinUtteranceLength = 20.0f;

            // Initialize sherpa-ncnn recognizer
            if (sherpaRecognizer != null) {
                sherpaRecognizer.release();
            }

            sherpaRecognizer = new SherpaNcnn(config);

            useSherpaNcnn = true;
            isListening = true;
            recognitionStartTime = System.currentTimeMillis();
            emitState(STT_STATE_EVENT, "listening", null);

            // Start audio recording thread
            startSherpaAudioThread();

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            releaseSherpaResources();
            call.reject(error.getMessage() != null ? error.getMessage() : "启动本地语音识别失败");
        }
    }

    private void copyAssetIfNeeded(String assetPath, File destFile) throws IOException {
        if (destFile.exists() && destFile.length() > 0) {
            return;
        }
        try (InputStream in = getContext().getAssets().open(assetPath);
             OutputStream out = new FileOutputStream(destFile)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        }
    }

    private void startSherpaAudioThread() {
        sherpaRunning.set(true);
        emitState(STT_STATE_EVENT, "recording", null);

        sherpaThread = new Thread(() -> {
            int minBufferSize = AudioRecord.getMinBufferSize(
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
            );
            int bufferSize = Math.max(minBufferSize, SAMPLE_RATE / 10 * 2); // at least 100ms

            sherpaAudioRecord = new AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    bufferSize
            );

            if (sherpaAudioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
                mainHandler.post(() -> {
                    emitError(STT_ERROR_EVENT, "麦克风初始化失败", "audio_init_failed", null);
                    stopSherpaInternal();
                });
                return;
            }

            sherpaAudioRecord.startRecording();
            short[] buffer = new short[bufferSize / 2];

            while (sherpaRunning.get() && !stopRequested) {
                int read = sherpaAudioRecord.read(buffer, 0, buffer.length);
                if (read > 0) {
                    float[] samples = new float[read];
                    for (int i = 0; i < read; i++) {
                        samples[i] = buffer[i] / 32768.0f;
                    }

                    sherpaRecognizer.acceptWaveform(samples, SAMPLE_RATE);

                    if (sherpaRecognizer.isReady()) {
                        sherpaRecognizer.decode();
                        String text = sherpaRecognizer.getText();
                        if (text != null && !text.isEmpty()) {
                            latestPartialTranscript = text;
                            mainHandler.post(() -> emitSTTResult(text, false));
                        }
                    }
                }
            }

            // Final decode
            String finalText = "";
            try {
                sherpaRecognizer.inputFinished();
                while (sherpaRecognizer.isReady()) {
                    sherpaRecognizer.decode();
                }
                finalText = sherpaRecognizer.getText();
            } catch (Exception e) {
                // fall through to resolve with best transcript
            }

            if (finalText != null && !finalText.isEmpty()) {
                latestTranscript = finalText;
                final String textToEmit = finalText;
                mainHandler.post(() -> {
                    emitSTTResult(textToEmit, true);
                    resolveSherpaStop(textToEmit);
                });
            } else {
                String fallback = bestTranscript();
                mainHandler.post(() -> resolveSherpaStop(fallback));
            }

            // Cleanup audio record
            try {
                sherpaAudioRecord.stop();
            } catch (Exception ignored) {
            }
            try {
                sherpaAudioRecord.release();
            } catch (Exception ignored) {
            }
            sherpaAudioRecord = null;
        });
        sherpaThread.start();
    }

    private void stopSherpaRecognition(PluginCall call) {
        if (!isListening || !useSherpaNcnn) {
            call.resolve(new JSObject().put("text", bestTranscript()));
            return;
        }

        if (pendingStopCall != null) {
            pendingStopCall.resolve(new JSObject().put("text", bestTranscript()));
        }
        pendingStopCall = call;
        stopRequested = true;

        scheduleStopFallback();
    }

    private void resolveSherpaStop(String text) {
        cancelStopFallback();
        isListening = false;
        stopRequested = false;
        useSherpaNcnn = false;

        PluginCall stopCall = pendingStopCall;
        pendingStopCall = null;

        emitState(STT_STATE_EVENT, "idle", null);
        releaseSherpaResources();

        if (stopCall != null) {
            JSObject result = new JSObject();
            result.put("text", text != null ? text : "");
            stopCall.resolve(result);
        }
    }

    private void cancelSherpaRecognition() {
        sherpaRunning.set(false);
        stopRequested = false;
        isListening = false;
        useSherpaNcnn = false;

        PluginCall stopCall = pendingStopCall;
        pendingStopCall = null;
        if (stopCall != null) {
            stopCall.resolve(new JSObject().put("text", ""));
        }

        cancelStopFallback();
        emitState(STT_STATE_EVENT, "idle", null);

        if (sherpaThread != null) {
            try {
                sherpaThread.join(500);
            } catch (InterruptedException ignored) {
            }
            sherpaThread = null;
        }

        if (sherpaAudioRecord != null) {
            try {
                sherpaAudioRecord.stop();
            } catch (Exception ignored) {
            }
            try {
                sherpaAudioRecord.release();
            } catch (Exception ignored) {
            }
            sherpaAudioRecord = null;
        }

        releaseSherpaResources();
    }

    private void stopSherpaInternal() {
        sherpaRunning.set(false);
        isListening = false;
        stopRequested = false;
        useSherpaNcnn = false;
        cancelStopFallback();
        emitState(STT_STATE_EVENT, "idle", null);
        releaseSherpaResources();
    }

    private void releaseSherpaResources() {
        if (sherpaRecognizer != null) {
            try {
                sherpaRecognizer.release();
            } catch (Exception ignored) {
            }
            sherpaRecognizer = null;
        }
    }

    // ==================== System STT ====================

    private void startSystemRecognition(PluginCall call, String language) {
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
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());

            isListening = true;
            recognitionStartTime = System.currentTimeMillis();
            emitState(STT_STATE_EVENT, "listening", null);
            speechRecognizer.startListening(intent);

            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            releaseSpeechRecognizer();
            call.reject(error.getMessage() != null ? error.getMessage() : "启动系统语音识别失败");
        }
    }

    private void stopSystemRecognition(PluginCall call) {
        if (speechRecognizer == null || !isListening) {
            call.resolve(new JSObject().put("text", bestTranscript()));
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
    }

    private void cancelRecognitionInternal(boolean emitStoppedState) {
        if (useSherpaNcnn) {
            cancelSherpaRecognition();
            return;
        }

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

    // ==================== Audio Recording ====================

    @PluginMethod
    public void startAudioRecording(PluginCall call) {
        runOnMainThread(() -> {
            if (!hasRecordPermission()) {
                call.reject("缺少麦克风权限 (RECORD_AUDIO)");
                return;
            }
            if (isListening) {
                call.reject("当前正在进行语音识别，请先停止");
                return;
            }
            cancelAudioRecordingInternal();

            try {
                audioRecordFile = File.createTempFile("echo-recording-", ".m4a", getContext().getCacheDir());
                audioRecorder = new MediaRecorder();
                audioRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                audioRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                audioRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
                audioRecorder.setAudioChannels(1);
                audioRecorder.setAudioSamplingRate(Math.max(8000, call.getInt("sampleRate", 16000)));
                audioRecorder.setAudioEncodingBitRate(64000);
                audioRecorder.setOutputFile(audioRecordFile.getAbsolutePath());
                audioRecorder.prepare();
                audioRecorder.start();

                JSObject result = new JSObject();
                result.put("started", true);
                call.resolve(result);
            } catch (Exception error) {
                cancelAudioRecordingInternal();
                call.reject(error.getMessage() != null ? error.getMessage() : "原生录音启动失败");
            }
        });
    }

    @PluginMethod
    public void stopAudioRecording(PluginCall call) {
        runOnMainThread(() -> {
            try {
                if (audioRecorder == null || audioRecordFile == null) {
                    call.reject("当前没有正在进行的录音");
                    return;
                }

                try {
                    audioRecorder.stop();
                } catch (RuntimeException ignored) {
                }
                audioRecorder.release();
                audioRecorder = null;

                byte[] bytes = readAllBytes(audioRecordFile);
                JSObject result = new JSObject();
                result.put("base64", Base64.encodeToString(bytes, Base64.NO_WRAP));
                result.put("mimeType", "audio/mp4");
                result.put("filename", "recording.m4a");
                audioRecordFile.delete();
                audioRecordFile = null;
                call.resolve(result);
            } catch (Exception error) {
                cancelAudioRecordingInternal();
                call.reject(error.getMessage() != null ? error.getMessage() : "原生录音停止失败");
            }
        });
    }

    @PluginMethod
    public void cancelAudioRecording(PluginCall call) {
        runOnMainThread(() -> {
            cancelAudioRecordingInternal();
            call.resolve();
        });
    }

    // ==================== TTS ====================

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
    public void installTtsData(PluginCall call) {
        runOnMainThread(() -> {
            try {
                Intent installIntent = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                installIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(installIntent);
                call.resolve(new JSObject().put("launched", true));
            } catch (Exception error) {
                call.reject(error.getMessage() != null ? error.getMessage() : "无法启动语音包安装界面");
            }
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
            cancelAudioRecordingInternal();
            releaseTextToSpeech();
        });
    }

    // ==================== Helpers ====================

    private byte[] readAllBytes(File file) throws Exception {
        long length = file.length();
        if (length <= 0 || length > Integer.MAX_VALUE) {
            throw new Exception("录音文件无效");
        }

        byte[] bytes = new byte[(int) length];
        try (FileInputStream input = new FileInputStream(file)) {
            int offset = 0;
            while (offset < bytes.length) {
                int count = input.read(bytes, offset, bytes.length - offset);
                if (count < 0) break;
                offset += count;
            }
        }
        return bytes;
    }

    private void cancelAudioRecordingInternal() {
        if (audioRecorder != null) {
            try {
                audioRecorder.stop();
            } catch (Exception ignored) {
            }
            try {
                audioRecorder.release();
            } catch (Exception ignored) {
            }
            audioRecorder = null;
        }

        if (audioRecordFile != null) {
            try {
                audioRecordFile.delete();
            } catch (Exception ignored) {
            }
            audioRecordFile = null;
        }
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
            int fallbackStatus = textToSpeech.setLanguage(Locale.SIMPLIFIED_CHINESE);
            if (fallbackStatus == TextToSpeech.LANG_MISSING_DATA || fallbackStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
                call.reject(languageStatus == TextToSpeech.LANG_MISSING_DATA
                    ? "系统语音包未安装，请调用 installTtsData 引导用户下载"
                    : "系统语音不支持当前语言");
                return;
            }
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

                long elapsed = System.currentTimeMillis() - recognitionStartTime;
                boolean tooShort = elapsed < MIN_RECOGNITION_DURATION_MS;

                if (tooShort && (
                    error == SpeechRecognizer.ERROR_CLIENT
                    || error == SpeechRecognizer.ERROR_NO_MATCH
                    || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                )) {
                    resolveStopCall(bestTranscript());
                    return;
                }

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
            case 12: // ERROR_LANGUAGE_NOT_SUPPORTED
                return "系统语音识别不支持当前语言，请改用云端 STT";
            case 13: // ERROR_LANGUAGE_UNAVAILABLE
                return "本地语音模型未下载，请到「系统设置 > 语言和输入 > 语音输入」下载离线包，或改用云端 STT";
            case 14: // ERROR_SERVER_DISCONNECTED
                return "系统语音识别服务已断开";
            case 15: // ERROR_TOO_MANY_REQUESTS
                return "系统语音识别请求过多";
            default:
                return "系统语音识别失败 (code=" + error + ")";
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

    private boolean hasRecordPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;
    }
}
