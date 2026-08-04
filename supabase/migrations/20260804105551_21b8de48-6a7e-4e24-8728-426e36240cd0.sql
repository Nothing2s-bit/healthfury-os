CREATE TABLE public.patient_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL UNIQUE,
  patient_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  captured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  date_of_birth date,
  sex text,
  id_number text,
  phone text,
  chief_complaint text,
  condition text,
  status text NOT NULL DEFAULT 'stable',
  bp text,
  hr text,
  temp text,
  spo2 text,
  allergies text[] NOT NULL DEFAULT '{}',
  medications text[] NOT NULL DEFAULT '{}',
  notes text,
  latitude double precision,
  longitude double precision,
  location_accuracy_m double precision,
  address text,
  area_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.patient_files TO authenticated;
GRANT ALL ON public.patient_files TO service_role;

ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read patient files" ON public.patient_files
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "patients read own file" ON public.patient_files
  FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "staff create patient files" ON public.patient_files
  FOR INSERT TO authenticated
  WITH CHECK (
    captured_by = auth.uid()
    AND (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "staff update patient files" ON public.patient_files
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'doctor'::app_role) OR has_role(auth.uid(), 'nurse'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER patient_files_updated_at
  BEFORE UPDATE ON public.patient_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX patient_files_name_idx ON public.patient_files (lower(full_name));
CREATE INDEX patient_files_mrn_idx ON public.patient_files (lower(mrn));