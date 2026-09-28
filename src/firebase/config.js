import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAO523a-PuVBzYDOY_MuTYhWr-Jycuwwcc",
  authDomain: "chatloop-13918.firebaseapp.com",
  projectId: "chatloop-13918",
  storageBucket: "chatloop-13918.firebasestorage.app",
  messagingSenderId: "377797132737",
  appId: "1:377797132737:web:455ddd0761009f65eaaf40",
  measurementId: "G-HE4S77CZTG",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize providers
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

// Optional: Add scopes if needed
googleProvider.addScope("profile");
googleProvider.addScope("email");
githubProvider.addScope("user:email");

export default app;
