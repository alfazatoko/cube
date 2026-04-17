import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore/lite";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBsDCnrhdxkDvUY7QhQNOt9ZhpgRU7sce8",
  authDomain: "kasir-cube.firebaseapp.com",
  projectId: "kasir-cube",
  storageBucket: "kasir-cube.firebasestorage.app",
  messagingSenderId: "501157158987",
  appId: "1:501157158987:web:44156f3a36e22c675b6dce",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
