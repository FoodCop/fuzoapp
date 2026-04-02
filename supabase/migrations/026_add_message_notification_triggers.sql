-- Migration 026: Add message notification triggers
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_receiver_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT display_name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;

  -- Determine receiver
  SELECT 
    CASE 
      WHEN participant_1 = NEW.sender_id THEN participant_2
      ELSE participant_1
    END INTO v_receiver_id
  FROM public.dm_conversations
  WHERE id = NEW.conversation_id;

  -- Create notification
  IF v_receiver_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_receiver_id,
      'new_message',
      'New Message',
      v_sender_name || ' sent you a message',
      jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.dm_messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();
