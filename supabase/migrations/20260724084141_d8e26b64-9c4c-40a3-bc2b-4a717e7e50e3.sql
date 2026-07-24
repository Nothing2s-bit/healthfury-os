
CREATE POLICY "chat-media participants read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );

CREATE POLICY "chat-media participants upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND owner = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.patient_id = auth.uid() OR c.doctor_id = auth.uid())
    )
  );
