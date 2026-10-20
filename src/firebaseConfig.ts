import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBr3Uhy32gqAb7qyGUvnHAggNIbyp8NzYE",
  authDomain: "cogniva-88be7.firebaseapp.com",
  projectId: "cogniva-88be7",
  storageBucket: "cogniva-88be7.firebasestorage.app",
  messagingSenderId: "828603212990",
  appId: "1:828603212990:web:9c4c9ea7402a157a17aaef",
  measurementId: "G-93456YBTJ5"
};

// Initialize Firebase
const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);