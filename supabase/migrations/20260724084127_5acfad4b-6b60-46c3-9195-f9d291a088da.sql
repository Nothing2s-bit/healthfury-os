
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_doctor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  cid uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _doctor_id AND role = 'doctor') THEN
    RAISE EXCEPTION 'target user is not a doctor';
  END IF;
  SELECT id INTO cid FROM public.conversations
    WHERE patient_id = uid AND doctor_id = _doctor_id;
  IF cid IS NULL THEN
    INSERT INTO public.conversations (patient_id, doctor_id)
      VALUES (uid, _doctor_id)
      RETURNING id INTO cid;
  END IF;
  RETURN cid;
END $$;

REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;
