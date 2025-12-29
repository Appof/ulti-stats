# Ulti Stats

A web application for tracking ultimate frisbee statistics.

## Tech Stack

- **Frontend:** React 19 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** MobX
- **Backend:** Firebase (Auth, Firestore, Hosting)
- **Forms & Validation:** React Hook Form + Zod
- **Routing:** React Router

## Features

- Google Authentication
- Tournament management (create, select, switch)
- Team management with player rosters
- Game tracking with live scoring
- Player statistics (goals, assists, MVP)
- Gender-based MVP tracking (male/female)
- History/audit log

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Google provider)
   - Create a Firestore database
   - Copy your Firebase config to `.env`:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

3. Set up allowed emails (required for login):
   - In Firebase Console, go to Firestore Database
   - Create a collection called `allowedEmails`
   - Add documents where the **document ID is the email** (lowercase):
     ```
     allowedEmails/
     ├── user@example.com      ← document ID
     ├── another@gmail.com     ← document ID
     ```
   - No fields are required inside the documents
   - Only users with emails matching a document ID can sign in

4. Run development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Deploy to Firebase:
   ```bash
   npm run deploy
   ```

## TODO

- [ ] Refactor game score UI
- [X] Add export stats result button
- [X] Finish tournament functionality
- [X] Finish history functionality
- [X] Refactor auth for login (only allowed emails)
- [X] Display info in home page
- [X] Fix mobile styles for main pages
- [ ] Hosting, push to GitHub
 
