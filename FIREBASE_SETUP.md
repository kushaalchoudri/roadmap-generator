# Firebase Setup Guide

To enable shared database functionality for your team, follow these steps to set up Firebase:

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "roadmap-generator")
4. Continue through the setup wizard (you can disable Google Analytics if you want)
5. Click "Create Project"

## Step 2: Register Your Web App

1. In your Firebase project, click the Web icon (</>) to add a web app
2. Give your app a nickname (e.g., "Roadmap Generator Web")
3. **Don't** check "Also set up Firebase Hosting" (we're using GitHub Pages)
4. Click "Register app"
5. You'll see your Firebase configuration object - **keep this page open!**

## Step 3: Enable Firestore Database

1. In the Firebase Console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in **production mode**" (we'll set up security rules next)
4. Select a location closest to your team (e.g., us-central)
5. Click "Enable"

## Step 4: Set Up Security Rules

1. Still in Firestore Database, click the "Rules" tab
2. Replace the rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /roadmaps/{roadmapId} {
      // Anyone can read all roadmaps
      allow read: if true;

      // Anyone can create, update, and delete roadmaps
      // In the future, you can add authentication here
      allow write: if true;
    }
  }
}
```

3. Click "Publish"

**Note:** These rules allow anyone with the link to read/write. For better security, consider adding Firebase Authentication later.

## Step 5: Add Firebase Config to Your Application

1. Copy the Firebase configuration from Step 2 (or get it from Project Settings > General > Your apps)
2. Create a new file in your project: `firebase-config.js`
3. Paste this content, replacing the values with your actual Firebase config:

```javascript
// Firebase Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
}
```

## Step 6: Deploy to GitHub Pages

1. Add the new `firebase-config.js` file to git:
   ```bash
   git add firebase-config.js
   git commit -m "Add Firebase configuration"
   git push origin main
   ```

2. Wait 2-3 minutes for GitHub Pages to rebuild

3. Your app will be available at: `https://kushaalchoudri.github.io/roadmap-generator/home.html`

## Testing

1. Open your GitHub Pages URL in a browser
2. Create a new roadmap
3. Open the same URL in a different browser or incognito window
4. You should see the roadmap you created!

## Important Notes

- **The app will work without Firebase** - it will fall back to localStorage (local-only storage)
- **With Firebase enabled** - all users will see the same roadmaps in real-time
- **Security:** The current setup allows anyone with the link to edit roadmaps. For production use, consider adding Firebase Authentication to restrict access to your team only.

## Future Enhancements

To restrict access to your team only:
1. Enable Firebase Authentication (Email/Password or Google Sign-In)
2. Update Firestore security rules to check for authenticated users
3. Add login/logout functionality to the app

## Troubleshooting

- **"Firebase is not defined" error:** Make sure `firebase-config.js` exists and has your correct configuration
- **Can't save data:** Check your Firestore security rules in Firebase Console
- **Old data showing:** Clear browser cache or use Incognito mode to test
