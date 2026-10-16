TREADS TRACKER — STARTER WEBSITE

FILES
- index.html: page structure
- style.css: responsive styling
- app.js: Supabase authentication, agent submission, admin dashboard, completion button
- setup-delete-function.sql: separate admin-only deletion function
- add-agent-profile-template.sql: add an agent profile after creating their Auth user

IMPORTANT SECURITY NOTES
1. Never put a Supabase service_role/secret key in app.js or any public GitHub repository.
2. Use only the Supabase project URL and publishable/anon key in app.js.
3. This frontend relies on database RLS policies and the admin profile role. A hidden button is not security.
4. Test with fictional records and separate test agent/admin accounts before real data.
5. Deleting a row from the live table does not guarantee immediate removal from backups/logs.
6. Collect only data authorized for the workflow and follow the officer/department's retention rules.
7. The app currently has a generic Record title/reference + Details form. Customize only after confirming the actual required fields.
8. The delete function intentionally contains DELETE. Supabase may show a warning. Review it; it deletes only the selected completed row when called by an authenticated admin.
9. The existing database needs the tables and policies created in earlier steps, including:
   - profiles: user profile with id, full_name, role
   - submissions: id, agent_id, form_data, status, created_at
   - completion_stats: id, completed_on
   - RLS policies allowing agents to read their own submissions and submit their own pending records, and admins to view all submissions/statistics
   - public.mark_submission_completed(uuid) function

SETUP
A. Configure app.js
- Supabase Dashboard > Project Settings (or Connect/API settings) > copy the Project URL.
- Copy the publishable key or legacy anon/public key.
- Paste them into SUPABASE_URL and SUPABASE_PUBLIC_KEY in app.js.
- Never use a secret/service-role key.

B. Upload to GitHub
- Create a repository named treads-tracker (or your preferred name).
- Upload index.html, style.css, and app.js to the repository root.
- Do not upload any secret keys or private records.
- Commit the files.

C. Enable GitHub Pages
- Repository > Settings > Pages.
- Build and deployment: Deploy from a branch.
- Branch: main (or your default branch), folder /(root).
- Save and wait for the published URL.

D. Create agent users
- Supabase > Authentication > Users > Add user.
- After creating each user, use add-agent-profile-template.sql with that user's email and name.
- Do not give agents admin roles. Do not share logins.

E. Create delete function
- First test using fictional records.
- Open setup-delete-function.sql in the Supabase SQL Editor and review it.
- Run it only when ready to enable the website's Delete completed record button. The warning is expected because the function permanently deletes the selected completed row.
- If you do not create this function, the delete button will show an error and deletion will not work.

F. Test checklist
- Agent A signs in, submits a fictional record, and sees only their own records.
- Agent B signs in and cannot see Agent A's record.
- Both admins can see submissions.
- Admin marks a fictional record completed; it remains in Completed.
- Admin deletes that completed record; it disappears from the live submissions list.
- Completion statistic remains.
- Agent cannot call admin functions or promote their role.
- Test both admin accounts separately.

TROUBLESHOOTING
- "No profile": the auth user exists but has no matching public.profiles row.
- "Permission denied": inspect the RLS policies/grants; do not turn RLS off.
- "Function not found": the relevant SQL function has not been created.
- Never fix permissions by putting a service-role key in the website.
