-- 1. VOUCHERS / PAY GATE
CREATE TABLE public.vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('booking','scan')),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','used','refunded')),
  method text NOT NULL DEFAULT 'voucher',
  consumed_at timestamptz,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vouchers select" ON public.vouchers FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_health_staff(auth.uid()));
CREATE POLICY "own vouchers insert" ON public.vouchers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own vouchers update" ON public.vouchers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. PATIENT PHOTO
ALTER TABLE public.patient_files ADD COLUMN IF NOT EXISTS photo_path text;

CREATE POLICY "staff read patient photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-photos' AND public.is_health_staff(auth.uid()));
CREATE POLICY "staff upload patient photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-photos' AND public.is_health_staff(auth.uid()));
CREATE POLICY "staff update patient photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'patient-photos' AND public.is_health_staff(auth.uid()));

-- 3. STOCK DEPARTMENTS
ALTER TABLE public.medical_stock ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'Pharmacy';
UPDATE public.medical_stock SET department = CASE WHEN category = 'medicine' THEN 'Pharmacy' ELSE 'General Stores' END;

INSERT INTO public.medical_stock (item_name, category, unit, quantity_on_hand, reorder_level, location, department) VALUES
  ('Paracetamol 500mg', 'medicine', 'tablets', 4200, 800, 'Pharmacy Store A', 'Pharmacy'),
  ('Amoxicillin 250mg', 'medicine', 'capsules', 1800, 500, 'Pharmacy Store A', 'Pharmacy'),
  ('Metformin 500mg', 'medicine', 'tablets', 2600, 600, 'Pharmacy Store B', 'Pharmacy'),
  ('Enalapril 10mg', 'medicine', 'tablets', 1500, 400, 'Pharmacy Store B', 'Pharmacy'),
  ('ARV Tenofovir/Lamivudine/Dolutegravir', 'medicine', 'tablets', 3000, 900, 'Chronic Dispensary', 'Pharmacy'),
  ('Oral Rehydration Solution', 'medicine', 'sachets', 900, 250, 'Pharmacy Store A', 'Pharmacy'),
  ('Surgical scissors', 'tool', 'units', 45, 10, 'Theatre Store', 'Theatre'),
  ('Artery forceps', 'tool', 'units', 60, 15, 'Theatre Store', 'Theatre'),
  ('Suture kit', 'tool', 'kits', 120, 30, 'Theatre Store', 'Theatre'),
  ('Digital thermometer', 'tool', 'units', 80, 20, 'OPD Store', 'General Stores'),
  ('Blood pressure cuff', 'tool', 'units', 35, 8, 'OPD Store', 'General Stores'),
  ('Pulse oximeter', 'tool', 'units', 28, 6, 'OPD Store', 'General Stores'),
  ('Examination gloves (M)', 'consumable', 'boxes', 400, 100, 'Central Store', 'General Stores'),
  ('Surgical masks', 'consumable', 'boxes', 350, 90, 'Central Store', 'General Stores'),
  ('Syringes 5ml', 'consumable', 'units', 5000, 1200, 'Central Store', 'General Stores'),
  ('Blood collection tubes (EDTA)', 'consumable', 'units', 1800, 400, 'Lab Store', 'Laboratory'),
  ('Rapid HIV test kit', 'consumable', 'kits', 700, 200, 'Lab Store', 'Laboratory'),
  ('Glucose test strips', 'consumable', 'strips', 2400, 600, 'Lab Store', 'Laboratory'),
  ('Microscope slides', 'tool', 'units', 900, 200, 'Lab Store', 'Laboratory'),
  ('Delivery pack', 'consumable', 'packs', 150, 40, 'Maternity Store', 'Maternity'),
  ('Umbilical cord clamps', 'consumable', 'units', 300, 80, 'Maternity Store', 'Maternity'),
  ('Ambulance trauma kit', 'tool', 'kits', 22, 6, 'EMS Bay', 'EMS'),
  ('Oxygen cylinder (D size)', 'tool', 'units', 40, 10, 'EMS Bay', 'EMS'),
  ('Spinal immobilisation board', 'tool', 'units', 14, 4, 'EMS Bay', 'EMS');

-- 4. VACCINES
CREATE TABLE public.vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer text,
  target_disease text NOT NULL,
  doses_delivered integer NOT NULL DEFAULT 0,
  doses_used integer NOT NULL DEFAULT 0,
  doses_on_hand integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 50,
  storage_temp text NOT NULL DEFAULT '2-8C',
  batch_no text,
  expiry_date date,
  next_campaign_date date,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.vaccines TO authenticated;
GRANT ALL ON public.vaccines TO service_role;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vaccines" ON public.vaccines FOR SELECT TO authenticated USING (public.is_health_staff(auth.uid()));
CREATE POLICY "managers insert vaccines" ON public.vaccines FOR INSERT TO authenticated WITH CHECK (public.is_stock_manager(auth.uid()));
CREATE POLICY "managers update vaccines" ON public.vaccines FOR UPDATE TO authenticated USING (public.is_stock_manager(auth.uid())) WITH CHECK (public.is_stock_manager(auth.uid()));
CREATE TRIGGER vaccines_updated_at BEFORE UPDATE ON public.vaccines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.vaccine_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_id uuid NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('delivered','used','wasted')),
  quantity integer NOT NULL CHECK (quantity > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for date,
  location text,
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.vaccine_movements TO authenticated;
GRANT ALL ON public.vaccine_movements TO service_role;
ALTER TABLE public.vaccine_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read vaccine movements" ON public.vaccine_movements FOR SELECT TO authenticated USING (public.is_health_staff(auth.uid()));
CREATE POLICY "managers log vaccine movements" ON public.vaccine_movements FOR INSERT TO authenticated WITH CHECK (public.is_stock_manager(auth.uid()) AND actor_id = auth.uid());

INSERT INTO public.vaccines (name, manufacturer, target_disease, doses_delivered, doses_used, doses_on_hand, reorder_level, storage_temp, batch_no, expiry_date, next_campaign_date, location) VALUES
  ('BCG', 'Serum Institute', 'Tuberculosis', 1200, 940, 260, 100, '2-8C', 'BCG-2411', '2027-03-31', '2026-09-01', 'Cold Room A'),
  ('OPV (Polio)', 'Bio Farma', 'Poliomyelitis', 2000, 1650, 350, 150, '-20C', 'OPV-1180', '2026-12-15', '2026-08-25', 'Cold Room A'),
  ('Hexavalent (DTaP-IPV-HepB-Hib)', 'Sanofi', 'Six childhood diseases', 1500, 1310, 190, 120, '2-8C', 'HEX-7742', '2027-01-20', '2026-09-08', 'Cold Room B'),
  ('Measles', 'Serum Institute', 'Measles', 1800, 1520, 280, 150, '2-8C', 'MEA-5521', '2026-11-30', '2026-08-18', 'Cold Room B'),
  ('Rotavirus', 'GSK', 'Rotavirus diarrhoea', 900, 780, 120, 100, '2-8C', 'ROT-3390', '2027-02-28', '2026-09-15', 'Cold Room A'),
  ('PCV13', 'Pfizer', 'Pneumococcal disease', 1100, 1005, 95, 100, '2-8C', 'PCV-8812', '2026-10-31', '2026-08-20', 'Cold Room B'),
  ('HPV', 'MSD', 'Cervical cancer', 800, 610, 190, 80, '2-8C', 'HPV-2204', '2027-05-31', '2026-10-05', 'Cold Room C'),
  ('Tetanus Toxoid', 'Serum Institute', 'Tetanus', 1000, 720, 280, 100, '2-8C', 'TET-6690', '2027-04-30', '2026-09-22', 'Cold Room C'),
  ('COVID-19 (bivalent)', 'Pfizer', 'COVID-19', 2500, 2310, 190, 200, '-70C', 'COV-9931', '2026-09-30', '2026-08-30', 'Ultra-cold Freezer'),
  ('Influenza (seasonal)', 'Sanofi', 'Influenza', 1600, 1380, 220, 150, '2-8C', 'FLU-4417', '2026-10-15', '2026-08-14', 'Cold Room A');

-- 5. LABORATORY
CREATE TABLE public.lab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  sample_type text NOT NULL,
  turnaround_hours integer NOT NULL DEFAULT 24,
  price_cents integer NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lab_tests TO authenticated;
GRANT ALL ON public.lab_tests TO service_role;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read lab tests" ON public.lab_tests FOR SELECT TO authenticated USING (public.is_health_staff(auth.uid()));

CREATE TABLE public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_file_id uuid REFERENCES public.patient_files(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  test_id uuid REFERENCES public.lab_tests(id) ON DELETE SET NULL,
  test_name text NOT NULL,
  priority text NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent','stat')),
  status text NOT NULL DEFAULT 'collected' CHECK (status IN ('collected','in_lab','resulted','cancelled')),
  ordered_by uuid REFERENCES auth.users(id),
  ordered_by_name text,
  result_summary text,
  resulted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lab_orders TO authenticated;
GRANT ALL ON public.lab_orders TO service_role;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read lab orders" ON public.lab_orders FOR SELECT TO authenticated USING (public.is_health_staff(auth.uid()));
CREATE POLICY "staff create lab orders" ON public.lab_orders FOR INSERT TO authenticated WITH CHECK (public.is_health_staff(auth.uid()) AND ordered_by = auth.uid());
CREATE POLICY "staff update lab orders" ON public.lab_orders FOR UPDATE TO authenticated USING (public.is_health_staff(auth.uid())) WITH CHECK (public.is_health_staff(auth.uid()));
CREATE TRIGGER lab_orders_updated_at BEFORE UPDATE ON public.lab_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lab_tests (code, name, department, sample_type, turnaround_hours, price_cents, notes) VALUES
  ('FBC', 'Full Blood Count', 'Haematology', 'EDTA blood', 4, 12000, 'Anaemia, infection, platelets'),
  ('HB', 'Haemoglobin', 'Haematology', 'EDTA blood', 2, 4500, 'Point of care available'),
  ('INR', 'INR / Prothrombin Time', 'Haematology', 'Citrate blood', 4, 9500, 'Warfarin monitoring'),
  ('UE', 'Urea and Electrolytes', 'Chemistry', 'Serum', 6, 14000, 'Renal function'),
  ('LFT', 'Liver Function Test', 'Chemistry', 'Serum', 6, 15500, 'ALT, AST, bilirubin'),
  ('GLU', 'Fasting Glucose', 'Chemistry', 'Fluoride blood', 2, 5000, 'Diabetes screening'),
  ('HBA1C', 'HbA1c', 'Chemistry', 'EDTA blood', 24, 19000, 'Diabetes control'),
  ('LIPID', 'Lipid Profile', 'Chemistry', 'Serum', 12, 17000, 'Fasting required'),
  ('TSH', 'Thyroid Stimulating Hormone', 'Chemistry', 'Serum', 24, 21000, 'Thyroid screening'),
  ('HIV', 'HIV Rapid Test', 'Serology', 'Whole blood', 1, 0, 'Free state-funded test'),
  ('VL', 'HIV Viral Load', 'Virology', 'EDTA blood', 72, 48000, 'ART monitoring'),
  ('CD4', 'CD4 Count', 'Immunology', 'EDTA blood', 48, 32000, 'Immune status'),
  ('TBGX', 'GeneXpert MTB/RIF', 'Microbiology', 'Sputum', 24, 39000, 'TB and rifampicin resistance'),
  ('CULT', 'Urine MC and S', 'Microbiology', 'Urine', 48, 22000, 'Culture and sensitivity'),
  ('MALP', 'Malaria Rapid Test', 'Parasitology', 'Whole blood', 1, 8000, 'Travel history required'),
  ('PREG', 'Pregnancy Test (hCG)', 'Chemistry', 'Urine', 1, 3500, 'Point of care'),
  ('CRP', 'C-Reactive Protein', 'Chemistry', 'Serum', 6, 11000, 'Inflammation marker'),
  ('COVID', 'SARS-CoV-2 PCR', 'Virology', 'Nasopharyngeal swab', 24, 45000, 'Outbreak surveillance'),
  ('PAP', 'Pap Smear Cytology', 'Cytology', 'Cervical smear', 120, 26000, 'Cervical screening'),
  ('BLDGRP', 'Blood Group and Rh', 'Blood Bank', 'EDTA blood', 4, 9000, 'Pre-transfusion');

-- 6. DOH SUBMISSIONS
CREATE TABLE public.doh_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  period_start date,
  period_end date,
  row_count integer NOT NULL DEFAULT 0,
  facility text,
  submitted_by uuid REFERENCES auth.users(id),
  submitted_by_name text,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doh_submissions TO authenticated;
GRANT ALL ON public.doh_submissions TO service_role;
ALTER TABLE public.doh_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read doh submissions" ON public.doh_submissions FOR SELECT TO authenticated USING (public.is_health_staff(auth.uid()));
CREATE POLICY "staff create doh submissions" ON public.doh_submissions FOR INSERT TO authenticated WITH CHECK (public.is_health_staff(auth.uid()) AND submitted_by = auth.uid());