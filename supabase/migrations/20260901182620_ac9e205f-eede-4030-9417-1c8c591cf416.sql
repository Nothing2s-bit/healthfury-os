CREATE TABLE public.misconduct_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name text,
  anonymous boolean NOT NULL DEFAULT false,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate',
  subject_name text,
  subject_role text,
  facility text,
  incident_at timestamptz,
  location text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  resolution_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_name text,
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.misconduct_reports TO authenticated;
GRANT ALL ON public.misconduct_reports TO service_role;

ALTER TABLE public.misconduct_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can file reports"
  ON public.misconduct_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporters can read their own reports"
  ON public.misconduct_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() AND anonymous = false);

CREATE POLICY "Staff can read all reports"
  ON public.misconduct_reports FOR SELECT TO authenticated
  USING (public.is_health_staff(auth.uid()));

CREATE POLICY "Staff can review reports"
  ON public.misconduct_reports FOR UPDATE TO authenticated
  USING (public.is_health_staff(auth.uid()))
  WITH CHECK (public.is_health_staff(auth.uid()));

CREATE TRIGGER misconduct_reports_updated_at
  BEFORE UPDATE ON public.misconduct_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX misconduct_reports_created_idx ON public.misconduct_reports (created_at DESC);