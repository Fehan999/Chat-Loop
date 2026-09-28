export const APP_NAME = "ChatLoop";

// full admin access, needs a verified email. keep in sync with isAdmin() in firestore.rules
export const ADMIN_EMAILS = ["itsfehan@gmail.com", "business.ehansiddique@gmail.com"];

// public guest login for the admin panel. it can read the dashboard but every
// write is blocked, both here and in firestore.rules (isGuest)
export const GUEST_EMAIL = "guest@chatloop-demo.app";
export const GUEST_PASSWORD = "ChatLoopGuest2026";

export const AI_CHAT_KEY = "chatloop-ai";
export const AI_NAME = "ChatLoop AI";

export const MESSAGE_PAGE_SIZE = 100;
export const MAX_IMAGES_PER_MESSAGE = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_VOICE_SECONDS = 5 * 60;
