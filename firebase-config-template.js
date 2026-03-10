// Firebase Configuration Template
// Copy this file to firebase-config.js and replace with your actual Firebase credentials

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase (this will be used by the app)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
}
