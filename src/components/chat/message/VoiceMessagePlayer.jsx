import { useEffect, useMemo, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import { formatDuration } from "../../../utils/dateUtils";

const BAR_COUNT = 28;
const PLAY_EVENT = "chatloop:voice-play";

// older voice notes don't have a saved waveform, so we fake a stable one
// from the url instead of showing a flat line
const fallbackBars = (seed = "") => {
  let hash = 7;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: BAR_COUNT }, () => {
    hash = (hash * 1103515245 + 12345) >>> 0;
    return 0.25 + (hash % 75) / 100;
  });
};

const VoiceMessagePlayer = ({ url, duration: savedDuration = 0, waveform, isMe }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(savedDuration);
  const [failed, setFailed] = useState(false);

  const bars = useMemo(() => (waveform?.length ? waveform : fallbackBars(url)), [waveform, url]);

  // only one voice note plays at a time
  useEffect(() => {
    const onOtherPlay = (e) => {
      if (e.detail !== audioRef.current) audioRef.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOtherPlay);
    return () => window.removeEventListener(PLAY_EVENT, onOtherPlay);
  }, []);

  const togglePlay = async (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: audio }));
    try {
      await audio.play();
    } catch {
      setFailed(true);
    }
  };

  const seek = (e) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  // chrome reports Infinity for MediaRecorder webm files, keep the saved length then
  const handleMetadata = (e) => {
    const value = e.currentTarget.duration;
    if (Number.isFinite(value) && value > 0) setDuration(value);
  };

  const progress = duration ? Math.min(1, currentTime / duration) : 0;
  const playedColor = isMe ? "bg-white" : "bg-indigo-500";
  const restColor = isMe ? "bg-white/40" : "bg-gray-300";

  return (
    <div
      className="flex w-[220px] max-w-full items-center gap-2.5 py-0.5"
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={togglePlay}
        disabled={failed}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition ${
          isMe
            ? "bg-white text-indigo-600 hover:bg-indigo-50"
            : "bg-indigo-500 text-white hover:bg-indigo-600"
        } disabled:opacity-50`}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? <FaPause size={11} /> : <FaPlay size={11} className="ml-0.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className="flex h-7 cursor-pointer items-center gap-[2px]"
          onClick={seek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
        >
          {bars.map((height, i) => (
            <span
              key={i}
              className={`w-[3px] flex-shrink-0 rounded-full ${
                i / bars.length < progress ? playedColor : restColor
              }`}
              style={{ height: `${Math.max(15, height * 100)}%` }}
            />
          ))}
        </div>
        <p className={`text-[11px] ${isMe ? "text-indigo-100" : "text-gray-500"}`}>
          {failed
            ? "Couldn't play this"
            : formatDuration(playing || currentTime > 0 ? currentTime : duration)}
        </p>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={handleMetadata}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
};

export default VoiceMessagePlayer;
