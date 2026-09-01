CREATE TABLE public.triage_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New triage',
  likely_condition text,
  urgency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.triage_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.triage_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.triage_sessions TO authenticated;
GRANT ALL ON public.triage_sessions TO service_role;
GRANT SELECT, INSERT, DELETE ON public.triage_messages TO authenticated;
GRANT ALL ON public.triage_messages TO service_role;

ALTER TABLE public.triage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own triage sessions"
  ON public.triage_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage their own triage messages"
  ON public.triage_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER triage_sessions_updated_at
  BEFORE UPDATE ON public.triage_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX triage_messages_session_idx ON public.triage_messages (session_id, created_at);
CREATE INDEX triage_sessions_user_idx ON public.triage_sessions (user_id, updated_at DESC);