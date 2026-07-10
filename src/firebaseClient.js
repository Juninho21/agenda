import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA1Nts0W8Q38zSzzJOlRxUUqpU2IPjyRy0",
  authDomain: "agenda-8409c.firebaseapp.com",
  projectId: "agenda-8409c",
  storageBucket: "agenda-8409c.firebasestorage.app",
  messagingSenderId: "825782200452",
  appId: "1:825782200452:web:21a980db70c32e59887ad1",
  measurementId: "G-28DF2BMK19"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicializando os serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
