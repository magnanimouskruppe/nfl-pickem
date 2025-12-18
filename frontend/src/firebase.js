import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC0EAcl_BFP8tnqYo0pv_yVDF1a_r9r3Hs",
  authDomain: "nfl-pickem-app-18eee.firebaseapp.com",
  projectId: "nfl-pickem-app-18eee",
  storageBucket: "nfl-pickem-app-18eee.firebasestorage.app",
  messagingSenderId: "132807982706",
  appId: "1:132807982706:web:d191139e6f4b65a45a8ceb",
  measurementId: "G-8NDFRN0EVC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, provider);
export const logout = () => signOut(auth);
export { auth };
