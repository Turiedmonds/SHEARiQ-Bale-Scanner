// Firebase configuration for the SHEΔR iQ Bale Scanner PWA
// Note: firebaseConfig values must remain unchanged.
const firebaseConfig = {
  apiKey: "AIzaSyDCjhgvsSzW9bmM9dF_vQB-FxwTyv6kU60",
  authDomain: "sheariq-bale-scanner.firebaseapp.com",
  projectId: "sheariq-bale-scanner",
  storageBucket: "sheariq-bale-scanner.firebasestorage.app",
  messagingSenderId: "453546913124",
  appId: "1:453546913124:web:717105eeef2dbd15c1de71"
};

// Initialize Firebase app only once
const firebaseApp = firebase.apps && firebase.apps.length
  ? firebase.app()
  : firebase.initializeApp(firebaseConfig);

// Obtain Firestore instance (reuse existing global if present)
const db = window.db || firebaseApp.firestore();

// Enable offline persistence for Firestore (compat API)
db.enablePersistence()
  .then(() => {
    console.info("Firestore offline persistence is active.");
  })
  .catch((err) => {
    console.warn(
      "Firestore offline persistence is unavailable; continuing without offline support.",
      err
    );
  });

// Expose Firestore globally for use in app.js
window.db = db;
