CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION app_private.is_health_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('doctor','nurse','admin','storage_manager','minister'));
$$;

CREATE OR REPLACE FUNCTION app_private.is_stock_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','storage_manager'));
$$;

GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_health_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_stock_manager(uuid) TO authenticated;

ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.is_health_staff(uuid) SECURITY INVOKER;
ALTER FUNCTION public.is_stock_manager(uuid) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_health_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_stock_manager(uuid) FROM PUBLIC, anon, authenticated;

ALTER POLICY "Staff read all bookings" ON public.bookings USING (app_private.has_role(auth.uid(), 'doctor') OR app_private.has_role(auth.uid(), 'nurse') OR app_private.has_role(auth.uid(), 'admin'));
ALTER POLICY "participants update conversation" ON public.conversations USING ((auth.uid() = patient_id) OR (auth.uid() = doctor_id)) WITH CHECK (((auth.uid() = patient_id) OR (auth.uid() = doctor_id)) AND app_private.has_role(doctor_id, 'doctor'));
ALTER POLICY "patient creates conversation" ON public.conversations WITH CHECK ((auth.uid() = patient_id) AND app_private.has_role(doctor_id, 'doctor') AND (doctor_id <> patient_id));
ALTER POLICY "staff create doh submissions" ON public.doh_submissions WITH CHECK (app_private.is_health_staff(auth.uid()) AND submitted_by = auth.uid());
ALTER POLICY "staff read doh submissions" ON public.doh_submissions USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "staff read lab orders" ON public.lab_orders USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "staff update lab orders" ON public.lab_orders USING (app_private.is_health_staff(auth.uid())) WITH CHECK (app_private.is_health_staff(auth.uid()));
ALTER POLICY "staff read lab tests" ON public.lab_tests USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "managers insert stock" ON public.medical_stock WITH CHECK (app_private.is_stock_manager(auth.uid()));
ALTER POLICY "managers update stock" ON public.medical_stock USING (app_private.is_stock_manager(auth.uid())) WITH CHECK (app_private.is_stock_manager(auth.uid()));
ALTER POLICY "staff read stock" ON public.medical_stock USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "Staff can read all reports" ON public.misconduct_reports USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "Staff can review reports" ON public.misconduct_reports USING (app_private.is_health_staff(auth.uid())) WITH CHECK (app_private.is_health_staff(auth.uid()));
ALTER POLICY "staff create patient files" ON public.patient_files WITH CHECK (captured_by = auth.uid() AND (app_private.has_role(auth.uid(), 'doctor') OR app_private.has_role(auth.uid(), 'nurse') OR app_private.has_role(auth.uid(), 'admin')));
ALTER POLICY "staff read patient files" ON public.patient_files USING (app_private.has_role(auth.uid(), 'doctor') OR app_private.has_role(auth.uid(), 'nurse') OR app_private.has_role(auth.uid(), 'admin'));
ALTER POLICY "staff update patient files" ON public.patient_files USING (app_private.has_role(auth.uid(), 'doctor') OR app_private.has_role(auth.uid(), 'nurse') OR app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'doctor') OR app_private.has_role(auth.uid(), 'nurse') OR app_private.has_role(auth.uid(), 'admin'));
ALTER POLICY "own or staff read audit log" ON public.scan_audit_log USING (actor_id = auth.uid() OR app_private.is_health_staff(auth.uid()));
ALTER POLICY "managers log deliveries" ON public.stock_deliveries WITH CHECK (app_private.is_stock_manager(auth.uid()) AND received_by = auth.uid());
ALTER POLICY "staff read deliveries" ON public.stock_deliveries USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "admins manage roles" ON public.user_roles USING (app_private.has_role(auth.uid(), 'admin')) WITH CHECK (app_private.has_role(auth.uid(), 'admin'));
ALTER POLICY "staff read vaccine movements" ON public.vaccine_movements USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "managers log vaccine movements" ON public.vaccine_movements WITH CHECK (app_private.is_stock_manager(auth.uid()) AND actor_id = auth.uid());
ALTER POLICY "managers insert vaccines" ON public.vaccines WITH CHECK (app_private.is_stock_manager(auth.uid()));
ALTER POLICY "managers update vaccines" ON public.vaccines USING (app_private.is_stock_manager(auth.uid())) WITH CHECK (app_private.is_stock_manager(auth.uid()));
ALTER POLICY "staff read vaccines" ON public.vaccines USING (app_private.is_health_staff(auth.uid()));
ALTER POLICY "own vouchers select" ON public.vouchers USING (user_id = auth.uid() OR app_private.is_health_staff(auth.uid()));

ALTER FUNCTION public.get_or_create_conversation(uuid) SET search_path = public, app_private;