import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7McnzGGp6H_Zbg7ssIkGLtoglLZTi_A",
  authDomain: "warden-tier-list.firebaseapp.com",
  databaseURL: "https://warden-tier-list-default-rtdb.firebaseio.com",
  projectId: "warden-tier-list",
  storageBucket: "warden-tier-list.firebasestorage.app",
  messagingSenderId: "434304733394",
  appId: "1:434304733394:web:83c91f87609acae6f8dd0b",
  measurementId: "G-SHTW4DFKF7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth and sign in anonymously
export const auth = getAuth(app);
signInAnonymously(auth).catch(console.error);

export default app;
