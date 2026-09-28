const PREFS_KEY = "chatloop:prefs";
const DEFAULT_PREFS = { sound: true, desktop: false };

export const getPrefs = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return { ...DEFAULT_PREFS, ...saved };
  } catch {
    return { ...DEFAULT_PREFS };
  }
};

export const savePrefs = (patch) => {
  const next = { ...getPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // private mode, nothing to do
  }
  return next;
};

let messageAudio = null;
let lastPlayedAt = 0;

// used when the mp3 is blocked or fails to load
const beep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    // audio not available
  }
};

// short ping for new messages and friend requests. throttled so a burst of
// messages doesn't turn into a machine gun
export const playNotificationSound = () => {
  if (!getPrefs().sound) return;
  const now = Date.now();
  if (now - lastPlayedAt < 800) return;
  lastPlayedAt = now;

  if (!messageAudio) {
    messageAudio = new Audio("/notification.mp3");
    messageAudio.volume = 0.6;
  }
  messageAudio.currentTime = 0;
  messageAudio.play().catch(beep);
};

export const canUseDesktopNotifications = () => "Notification" in window;

export const requestDesktopPermission = async () => {
  if (!canUseDesktopNotifications()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
};

// only shown while the tab is in the background, otherwise the sound is enough
export const showDesktopNotification = (title, body, icon) => {
  if (!getPrefs().desktop || !canUseDesktopNotifications()) return;
  if (Notification.permission !== "granted" || !document.hidden) return;
  try {
    const notification = new Notification(title, { body, icon, tag: title });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // some mobile browsers only allow notifications from a service worker
  }
};
