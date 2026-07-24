
-- Conversations between one patient and one doctor
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, doctor_id)
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "patient creates conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "participants update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE INDEX conversations_doctor_idx ON public.conversations(doctor_id, last_message_at DESC);
CREATE INDEX conversations_patient_idx ON public.conversations(patient_id, last_message_at DESC);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('text','image','audio','video')),
  body text,
  media_path text,
  media_mime text,
  media_duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
  ));

CREATE POLICY "participants send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );

CREATE INDEX messages_conversation_idx ON public.messages(conversation_id, created_at);

-- Bump conversation.last_message_at whenever a new message arrives
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- Get-or-create a conversation for a patient with a chosen doctor
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(_doctor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cid uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.has_role(_doctor_id, 'doctor') THEN
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

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) TO authenticated;

-- Directory of doctors so patients can pick one to chat with
CREATE OR REPLACE VIEW public.doctors_directory AS
  SELECT p.id, p.full_name, p.dept_specialty, p.consult_hours
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'doctor';

GRANT SELECT ON public.doctors_directory TO authenticated;

-- Enable realtime for messages + conversations
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
