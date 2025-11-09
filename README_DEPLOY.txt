SCOP Resource Hub — InfinityFree Deploy Guide

1) Upload ZIP and Extract
   - Upload this ZIP to your InfinityFree domain's htdocs/ using the File Manager.
   - Right-click the ZIP and choose Extract so that index.html, backend/, api/, and assets/ appear directly under htdocs/.

2) Set Database Password (one-time)
   - Open backend/api/config.hosting.php in the File Manager editor.
   - Set 'db_pass' => 'YOUR_VPANEL_PASSWORD_HERE' to your actual InfinityFree vPanel password.
   - Save the file.

3) Create Database & Import Schema
   - In the InfinityFree dashboard, open phpMyAdmin for your DB (if0_40042826_scop_db).
   - Import schema.sql first, then card_layout_update.sql (and updates.sql if any).

4) Google Sign-In
   - In Google Cloud Console, add your InfinityFree domain URL to Authorized JavaScript origins for your Web client.
   - The site already includes the correct Client ID in both frontend meta and backend config.

5) Test
   - Visit your site URL.
   - Sign in with Google; initially you’ll be pending until approved.
   - Open /admin-login.html to manage Student Approvals and content.

Notes
- Backend config auto-selects hosting settings in production.
- Uploads go to backend/uploads/YYYY/MM; ensure that directory exists and is writable (755 is typical).
- If you want us to embed the DB password directly and repackage, reply with your vPanel password (or set it yourself in step 2 above).
