// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCTYGZL1ATN-r2IEtoeIAZ3rYl-D64QPgI",
  authDomain: "ai-judge-e6384.firebaseapp.com",
  projectId: "ai-judge-e6384",
  storageBucket: "ai-judge-e6384.firebasestorage.app",
  messagingSenderId: "306986573893",
  appId: "1:306986573893:web:4ae45de7e752312907832c",
  measurementId: "G-CKGME1FQFB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export { app };