CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient uuid;
  sender_name text;
  preview text;
BEGIN
  SELECT CASE WHEN c.patient_id = NEW.sender_id THEN c.doctor_id ELSE c.patient_id END
    INTO recipient
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  IF recipient IS NULL OR recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(p.full_name, ''), 'HealthFury user') INTO sender_name
  FROM public.profiles p WHERE p.id = NEW.sender_id;

  preview := CASE
    WHEN NEW.kind = 'text' THEN LEFT(COALESCE(NEW.body, ''), 120)
    WHEN NEW.kind = 'image' THEN 'Sent a photo'
    WHEN NEW.kind = 'audio' THEN 'Sent a voice note'
    WHEN NEW.kind = 'video' THEN 'Sent a video'
    ELSE 'Sent an attachment'
  END;

  INSERT INTO public.notifications (user_id, kind, title, body, link, entity_id, urgency)
  VALUES (
    recipient,
    'message',
    'New message from ' || COALESCE(sender_name, 'HealthFury user'),
    preview,
    '/messages',
    NEW.conversation_id,
    'normal'
  );

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS messages_notify_recipient ON public.messages;
CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();