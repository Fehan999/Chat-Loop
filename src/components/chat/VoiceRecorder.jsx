import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiSend, FiTrash2 } from "react-icons/fi";
import { MAX_VOICE_SECONDS } from "../../constants";
import { formatDuration } from "../../utils/dateUtils";

const LIVE_BARS = 32;
const SAVED_BARS = 28;

// safari can't record webm, so pick whatever this browser supports
const pickMimeType = () => {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
};

// squeezes all the level samples into a fixed number of bars for the player
const downsample = (samples, count) => {
  if (samples.length === 0) return [];
  const size = samples.length / count;
  const bars = Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * size);
    const slice = samples.slice(start, Math.max(start + 1, Math.floor((i + 1) * size)));
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : 0;
  });
  const peak = Math.max(...bars, 0.01);
  return bars.map((v) => Number((v / peak).toFixed(2)));
};

// starts recording as soon as it mounts (the mic button click is the user
// gesture browsers want). cancel throws it away, send hands the blob up
const VoiceRecorder = ({ onSend, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => Array(LIVE_BARS).fill(0.08));
  const [ready, setReady] = useState(false);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const samplesRef = useRef([]);
  const startedAtRef = useRef(0);
  const finishRef = useRef(null);
  // the parent re-renders while we record, keep its latest callbacks without restarting
  const callbacksRef = useRef({ onSend, onCancel });
  callbacksRef.current = { onSend, onCancel };

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let audioContext = null;
    let frame = null;
    let timer = null;
    let lastSample = 0;

    const stopEverything = () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      audioContext?.close().catch(() => {});
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error("Microphone access is needed to record voice messages.");
        callbacksRef.current.onCancel();
        return;
      }
      if (cancelled) {
        stopEverything();
        return;
      }

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.start(250);
      startedAtRef.current = Date.now();
      setReady(true);

      // live level meter, sampled about 12 times a second
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        const tick = (now) => {
          if (now - lastSample > 80) {
            lastSample = now;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (const value of data) sum += ((value - 128) / 128) ** 2;
            const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
            samplesRef.current.push(level);
            setLevels((prev) => [...prev.slice(1), Math.max(0.08, level)]);
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      }

      timer = setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= MAX_VOICE_SECONDS) finishRef.current?.(true);
      }, 200);
    };

    start();

    // stop() resolves once the last chunk is flushed
    finishRef.current = (send) => {
      const recorder = recorderRef.current;
      finishRef.current = null;
      if (!recorder || recorder.state === "inactive") {
        stopEverything();
        if (!send) callbacksRef.current.onCancel();
        return;
      }
      recorder.onstop = () => {
        stopEverything();
        if (!send) return callbacksRef.current.onCancel();
        const duration = (Date.now() - startedAtRef.current) / 1000;
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        callbacksRef.current.onSend(
          blob,
          duration,
          downsample(samplesRef.current, SAVED_BARS),
          type
        );
      };
      recorder.stop();
    };

    return () => {
      cancelled = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      stopEverything();
    };
  }, []);

  const tooShort = elapsed < 0.7;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => finishRef.current?.(false)}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-500"
        aria-label="Discard recording"
      >
        <FiTrash2 className="text-lg" />
      </button>

      <div className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full bg-gray-100 px-4">
        <span className="flex items-center gap-2 text-sm font-medium tabular-nums text-gray-700">
          <span
            className={`h-2.5 w-2.5 rounded-full bg-red-500 ${ready ? "animate-pulse" : "opacity-40"}`}
          />
          {formatDuration(elapsed)}
        </span>
        <div className="flex h-6 flex-1 items-center justify-end gap-[2px] overflow-hidden">
          {levels.map((level, i) => (
            <span
              key={i}
              className="w-[3px] flex-shrink-0 rounded-full bg-indigo-400 transition-[height] duration-75"
              style={{ height: `${level * 100}%` }}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => finishRef.current?.(true)}
        disabled={!ready || tooShort}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white shadow-sm shadow-indigo-500/30 transition hover:bg-indigo-600 disabled:opacity-50"
        aria-label="Send voice message"
      >
        <FiSend className="text-lg" />
      </button>
    </div>
  );
};

export default VoiceRecorder;
