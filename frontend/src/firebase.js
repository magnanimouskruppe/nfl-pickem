import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut } from 'firebase/auth';

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
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// Use redirect on mobile, popup on desktop
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const loginWithGoogle = () => {
  if (isMobile) {
    return signInWithRedirect(auth, provider);
  }
  return signInWithPopup(auth, provider);
};

export const logout = () => signOut(auth);
