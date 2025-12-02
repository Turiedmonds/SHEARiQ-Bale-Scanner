// Firebase configuration for the SHEΔR iQ Bale Scanner PWA
// Note: firebaseConfig values must remain unchanged.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "sheariq-bale-scanner.firebaseapp.com",
  projectId: "sheariq-bale-scanner",
  storageBucket: "sheariq-bale-scanner.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
