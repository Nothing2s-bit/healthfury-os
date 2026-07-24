
-- Let signed-in users see which accounts are doctors (needed to list doctors)
CREATE POLICY "authenticated can see doctor role rows"
  ON public.user_roles FOR SELECT TO authenticated
  USING (role = 'doctor');

-- Recreate the directory as a SECURITY INVOKER view
DROP VIEW IF EXISTS public.doctors_directory;
CREATE VIEW public.doctors_directory
  WITH (security_invoker = on) AS
  SELECT p.id, p.full_name, p.dept_specialty, p.consult_hours
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'doctor';

-- Allow signed-in users to read doctor profile display info
CREATE POLICY "authenticated can read doctor profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = profiles.id AND r.role = 'doctor'
  ));

GRANT SELECT ON public.doctors_directory TO authenticated;
