// Shared Firebase setup, imported by index.html, auth.html, profile.html, people.html.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCetqc0Yf9HmT_mrnZi34QqX-pIkQ23lUc",
  authDomain: "aerodynamic-archive.firebaseapp.com",
  projectId: "aerodynamic-archive",
  storageBucket: "aerodynamic-archive.firebasestorage.app",
  messagingSenderId: "497229791567",
  appId: "1:497229791567:web:ba017dc034996a1feb853a",
  measurementId: "G-9D83VPYR6Z",
};

// IMPORTANT — set this to the email address of the person who should be the
// permanent owner account BEFORE that person signs in for the first time.
// The first sign-in from this address is automatically granted the 'owner'
// role. Everyone else starts as a plain 'user'.
export const OWNER_EMAIL = "avischultz2@gmail.com"; // <-- CHANGE THIS

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);