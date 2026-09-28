// firebase error codes -> something a person can act on
const MESSAGES = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-login-credentials": "Email or password is incorrect.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/email-already-in-use": "This email is already registered. Try logging in instead.",
  "auth/weak-password": "Password should be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a bit and try again.",
  "auth/network-request-failed": "Network error. Check your connection.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup.",
  "auth/expired-action-code": "This link has expired. Please request a new one.",
  "auth/invalid-action-code": "This link is invalid or was already used.",
};

export const authErrorMessage = (error, fallback = "Something went wrong. Please try again.") =>
  MESSAGES[error?.code] || fallback;
