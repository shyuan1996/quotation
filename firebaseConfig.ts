// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJL9l0WlSL4RRpfOIWsfW9BRsOGh_jAA4",
  authDomain: "quotation-shyuan.firebaseapp.com",
  projectId: "quotation-shyuan",
  storageBucket: "quotation-shyuan.firebasestorage.app",
  messagingSenderId: "597150645628",
  appId: "1:597150645628:web:b937737c4b4be75e0438f9",
  measurementId: "G-XHRNGY9DWV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Configuration is now hardcoded and valid
export const isFirebaseConfigured = true;