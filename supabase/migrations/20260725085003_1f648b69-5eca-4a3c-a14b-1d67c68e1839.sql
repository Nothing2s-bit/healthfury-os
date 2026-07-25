
-- CLINICS
CREATE TABLE public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  area_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  daily_capacity INT NOT NULL DEFAULT 40,
  opens_at TIME NOT NULL DEFAULT '07:00',
  closes_at TIME NOT NULL DEFAULT '17:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.clinics TO anon, authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clinics readable by everyone" ON public.clinics FOR SELECT USING (true);

INSERT INTO public.clinics (name, address, area_code, latitude, longitude, daily_capacity) VALUES
('Chris Hani Baragwanath Clinic', 'Chris Hani Rd, Diepkloof, Soweto', '1864', -26.2620, 27.9390, 60),
('Charlotte Maxeke Hospital', '17 Jubilee Rd, Parktown, Johannesburg', '2193', -26.1770, 28.0450, 80),
('Hillbrow Community Clinic', 'Klein St, Hillbrow, Johannesburg', '2001', -26.1880, 28.0480, 40),
('Alexandra Health Centre', '1 Selbourne St, Alexandra', '2090', -26.1020, 28.0980, 45),
('Sandton Medi-Clinic', '104 Rivonia Rd, Sandton', '2196', -26.1076, 28.0567, 50),
('Pretoria West Clinic', '350 Church St, Pretoria West', '0183', -25.7469, 28.1622, 35),
('Tembisa Provincial Hospital', 'Hospital Rd, Tembisa', '1632', -25.9990, 28.2280, 70),
('Kalafong Hospital', 'Kalafong Rd, Atteridgeville', '0008', -25.7690, 28.0730, 55);

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id),
  department TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  qr_payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read their own bookings" ON public.bookings
  FOR SELECT TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Patients create their own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (patient_id = auth.uid());
CREATE POLICY "Patients update their own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (patient_id = auth.uid());
CREATE POLICY "Staff read all bookings" ON public.bookings
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'doctor') OR
    public.has_role(auth.uid(), 'nurse')  OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE INDEX bookings_clinic_date_idx ON public.bookings (clinic_id, appointment_date);
CREATE INDEX bookings_patient_idx ON public.bookings (patient_id, created_at DESC);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
