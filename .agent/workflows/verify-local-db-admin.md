---
description: Build, Run, and Verify Local Database & Admin Features
---

This workflow sets up the application and guides you through verifying the newly implemented Dexie.js (IndexedDB) integration and the expanded Admin Dashboard features.

// turbo
1. Install project dependencies
```bash
npm install
```

// turbo
2. Build the project to verify TypeScript compilation
```bash
npm run build
```

3. Start the local development server
```bash
npm run dev
```

4. Verify Admin Dashboard & Audit Logs
Open the local URL provided by Vite (e.g., `http://localhost:5173`) in your browser, and follow these steps:
- Ensure the role is set to **Admin**.
- Log in with email: `admin1@hms.local` and password: `password123`.
- You will be redirected to the Admin Dashboard. Explore the new **System Overview** and **Global Settings** tabs.
- Navigate to the **Doctor Management** tab and click "Add New Doctor".
- Fill in the details (e.g., email `testdoc@hms.local`, password `pass123`) and submit.
- Navigate to the **Audit Logs** tab to verify that the system recorded the "Add Doctor" event.

5. Verify Doctor Role & Patient Database
- Log out of the Admin account.
- Change the role to **Doctor**.
- Log in with the newly created doctor credentials (e.g., `testdoc@hms.local` / `pass123`).
- Navigate to the **Patient Directory**.
- Click "Add Patient" and save a new record.
- Verify that the patient appears in the list and that clicking on them correctly loads their details asynchronously from the IndexedDB.
