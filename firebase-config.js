// ============================================================
// FIREBASE + SITE CONFIG
// Fill in the values below after you create your Firebase project.
// See README.md → "1. Set up Firebase" for exact steps.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

// 1) PASTE your Firebase web config here (Project settings → General → Your apps → Web app)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// 2) The email address YOU will register with (one time, via register.html)
//    to unlock the admin panel. Must match exactly (lowercase) what you also
//    put in firestore.rules and storage.rules.
export const ADMIN_EMAIL = "you@example.com";

// 2b) A short username for YOUR dedicated admin sign-in page (admin-login.html).
//     This is just a friendly front-end label — customers never see it, and
//     it's checked alongside your real password before signing in with
//     ADMIN_EMAIL above. Change it to anything you like.
export const ADMIN_USERNAME = "maryam";

// 3) After deploying the Cloud Function (README step 4), paste its URL here.
//    It looks like: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/chatWithAI
export const CHAT_FUNCTION_URL = "PASTE_YOUR_CLOUD_FUNCTION_URL_HERE";

// ------------------------------------------------------------
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL,
};
