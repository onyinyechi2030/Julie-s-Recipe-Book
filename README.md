# Julie's Recipe Book v16 — Firebase Sync

This version includes all 301 built-in recipes plus Google sign-in and Cloud Firestore synchronization for favorites, personal notes, shopping-list items, and custom recipes.

## Upload to GitHub Pages
1. Delete the previous repository files.
2. Upload `index.html` from this folder to the repository root.
3. Commit the change and open the GitHub Pages address.
4. Use **Sign in with Google**. Firebase sign-in and sync require the hosted HTTPS page; opening the file directly still shows recipes but does not provide reliable cloud authentication.

## Firebase console checklist
- Authentication → Sign-in method → Google: Enabled
- Authentication → Settings → Authorized domains: add `YOUR-USERNAME.github.io`
- Firestore Database: Created
- Firestore Rules: restrict `/users/{userId}/...` to `request.auth.uid == userId`

## Recommended Firestore rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

On first sign-in, local data is merged with the cloud copy instead of being erased.
