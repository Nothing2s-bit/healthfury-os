CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  staff_name text,
  role text,
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.staff_shifts TO authenticated;
GRANT ALL ON public.staff_shifts TO service_role;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff see shifts" ON public.staff_shifts FOR SELECT TO authenticated
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text IN ('admin','minister')));
CREATE POLICY "Own clock in" ON public.staff_shifts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own clock out" ON public.staff_shifts FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX staff_shifts_open_idx ON public.staff_shifts (user_id) WHERE clock_out IS NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;