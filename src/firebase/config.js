import { initializeApp } from "firebase/app";
import { getAuth, GithubAuthProvider, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// these values are public by design, access is controlled by firestore.rules
const firebaseConfig = {
  apiKey: "AIzaSyAO523a-PuVBzYDOY_MuTYhWr-Jycuwwcc",
  authDomain: "chatloop-13918.firebaseapp.com",
  projectId: "chatloop-13918",
  storageBucket: "chatloop-13918.firebasestorage.app",
  messagingSenderId: "377797132737",
  appId: "1:377797132737:web:455ddd0761009f65eaaf40",
  measurementId: "G-HE4S77CZTG",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

googleProvider.addScope("profile");
googleProvider.addScope("email");
githubProvider.addScope("user:email");

export default app;
