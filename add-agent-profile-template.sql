-- Run in Supabase SQL Editor AFTER creating the agent in Authentication > Users.
-- Replace agent@example.com and Agent Name with the actual agent email/name.
-- Repeat once per agent. Run as a trusted project administrator.
-- ON CONFLICT DO NOTHING avoids accidentally changing an existing role.

INSERT INTO public.profiles (id, full_name, role)
SELECT id, 'Agent Name', 'agent'
FROM auth.users
WHERE lower(email) = lower('agent@example.com')
ON CONFLICT (id) DO NOTHING;
