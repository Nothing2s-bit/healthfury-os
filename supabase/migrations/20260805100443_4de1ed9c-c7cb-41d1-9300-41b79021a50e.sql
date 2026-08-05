CREATE OR REPLACE FUNCTION public.is_health_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('doctor','nurse','admin','storage_manager','minister'));
$$;
REVOKE ALL ON FUNCTION public.is_health_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_health_staff(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_stock_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','storage_manager'));
$$;
REVOKE ALL ON FUNCTION public.is_stock_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_stock_manager(uuid) TO authenticated;

CREATE TABLE public.medical_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  category text NOT NULL DEFAULT 'medicine',
  unit text NOT NULL DEFAULT 'units',
  quantity_on_hand integer NOT NULL DEFAULT 0,
  reorder_level integer NOT NULL DEFAULT 20,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_stock TO authenticated;
GRANT ALL ON public.medical_stock TO service_role;
ALTER TABLE public.medical_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read stock" ON public.medical_stock FOR SELECT TO authenticated
  USING (public.is_health_staff(auth.uid()));
CREATE POLICY "managers insert stock" ON public.medical_stock FOR INSERT TO authenticated
  WITH CHECK (public.is_stock_manager(auth.uid()));
CREATE POLICY "managers update stock" ON public.medical_stock FOR UPDATE TO authenticated
  USING (public.is_stock_manager(auth.uid())) WITH CHECK (public.is_stock_manager(auth.uid()));
CREATE TRIGGER medical_stock_updated_at BEFORE UPDATE ON public.medical_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stock_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid REFERENCES public.medical_stock(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'units',
  delivered_at timestamptz NOT NULL DEFAULT now(),
  destination text NOT NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  supplier text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_deliveries TO authenticated;
GRANT ALL ON public.stock_deliveries TO service_role;
ALTER TABLE public.stock_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read deliveries" ON public.stock_deliveries FOR SELECT TO authenticated
  USING (public.is_health_staff(auth.uid()));
CREATE POLICY "managers log deliveries" ON public.stock_deliveries FOR INSERT TO authenticated
  WITH CHECK (public.is_stock_manager(auth.uid()) AND received_by = auth.uid());

DROP POLICY IF EXISTS "signed-in users read the audit log" ON public.scan_audit_log;
CREATE POLICY "own or staff read audit log" ON public.scan_audit_log FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_health_staff(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_stock;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_files;

INSERT INTO public.medical_stock (item_name, category, unit, quantity_on_hand, reorder_level, location) VALUES
 ('Panado 500mg','medicine','tablets',67,80,'Central Store A'),
 ('Amoxil 250mg','medicine','capsules',42,60,'Central Store A'),
 ('Insulin (Actrapid)','medicine','vials',28,30,'Cold Room 1'),
 ('ARV — TLD','medicine','packs',210,100,'Pharmacy Vault'),
 ('Surgical Gloves (M)','consumable','boxes',134,50,'Store B'),
 ('N95 Respirators','consumable','boxes',18,40,'Store B'),
 ('Saline Drip 1L','consumable','bags',96,60,'Store C'),
 ('Rapid TB Test Kits','diagnostic','kits',54,40,'Lab Store'),
 ('Blood Pressure Cuffs','equipment','units',12,10,'Equipment Bay'),
 ('Oxygen Cylinders','equipment','cylinders',9,12,'Oxygen Bay');

INSERT INTO public.stock_deliveries (item_name, quantity, unit, delivered_at, destination, supplier, received_by_name, note)
SELECT 'Panado 500mg', 500, 'tablets', now() - interval '2 days', 'Central Store A', 'Adcock Ingram', 'Sr. N. Dlamini', 'Monthly resupply'
UNION ALL SELECT 'Amoxil 250mg', 300, 'capsules', now() - interval '5 days', 'Central Store A', 'Aspen Pharmacare', 'Sr. N. Dlamini', 'Partial order'
UNION ALL SELECT 'N95 Respirators', 40, 'boxes', now() - interval '9 days', 'Store B', 'MedSupply SA', 'Mr. K. Mokoena', 'PPE top-up'
UNION ALL SELECT 'Oxygen Cylinders', 6, 'cylinders', now() - interval '1 day', 'Oxygen Bay', 'Afrox', 'Mr. K. Mokoena', 'Swap-out of empties'
UNION ALL SELECT 'Rapid TB Test Kits', 100, 'kits', now() - interval '12 days', 'Lab Store', 'NHLS', 'Dr. T. Baloyi', 'Quarterly allocation';