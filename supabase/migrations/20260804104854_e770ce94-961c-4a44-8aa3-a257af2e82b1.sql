CREATE TABLE public.scan_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type text NOT NULL CHECK (scan_type IN ('health','security')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','failed')),
  summary text,
  urgency text,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.scan_audit_log TO authenticated;
GRANT ALL ON public.scan_audit_log TO service_role;

ALTER TABLE public.scan_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signed-in users read the audit log"
  ON public.scan_audit_log FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users log their own scans"
  ON public.scan_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX scan_audit_log_created_at_idx ON public.scan_audit_log (created_at DESC);