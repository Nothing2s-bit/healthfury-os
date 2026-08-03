-- 1) Conversations: require the target to actually be a doctor, and freeze participants on UPDATE
DROP POLICY IF EXISTS "patient creates conversation" ON public.conversations;
CREATE POLICY "patient creates conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = patient_id
    AND public.has_role(doctor_id, 'doctor')
    AND doctor_id <> patient_id
  );

DROP POLICY IF EXISTS "participants update conversation" ON public.conversations;
CREATE POLICY "participants update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id)
  WITH CHECK (
    (auth.uid() = patient_id OR auth.uid() = doctor_id)
    AND public.has_role(doctor_id, 'doctor')
  );

CREATE OR REPLACE FUNCTION public.prevent_conversation_participant_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
     OR NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
    RAISE EXCEPTION 'conversation participants cannot be changed';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS conversations_freeze_participants ON public.conversations;
CREATE TRIGGER conversations_freeze_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_conversation_participant_change();

-- 2) user_roles: only admins may write; no client-side self-assignment
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Block self-granted admin at sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  chosen_role public.app_role;
BEGIN
  chosen_role := COALESCE((meta->>'role')::public.app_role, 'patient');
  IF chosen_role = 'admin' THEN
    chosen_role := 'patient';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, date_of_birth, id_number,
    staff_id, specialty, shift_preference,
    license_num, dept_specialty, consult_hours
  ) VALUES (
    NEW.id,
    NULLIF(meta->>'full_name',''),
    NULLIF(meta->>'date_of_birth','')::date,
    NULLIF(meta->>'id_number',''),
    NULLIF(meta->>'staff_id',''),
    NULLIF(meta->>'specialty',''),
    NULLIF(meta->>'shift_preference',''),
    NULLIF(meta->>'license_num',''),
    NULLIF(meta->>'dept_specialty',''),
    NULLIF(meta->>'consult_hours','')
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, chosen_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

-- 3) Lock down SECURITY DEFINER functions from direct API execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_control_metrics() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
