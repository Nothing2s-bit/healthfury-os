ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id);

CREATE POLICY "Staff update bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (
  app_private.has_role(auth.uid(), 'doctor'::app_role)
  OR app_private.has_role(auth.uid(), 'nurse'::app_role)
  OR app_private.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  app_private.has_role(auth.uid(), 'doctor'::app_role)
  OR app_private.has_role(auth.uid(), 'nurse'::app_role)
  OR app_private.has_role(auth.uid(), 'admin'::app_role)
);