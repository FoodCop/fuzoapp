-- Migration 032: Add social notification triggers
-- This migration adds real-time notifications for Group Messages, Friend Requests, and Points earned.

-- 1. GROUP MESSAGE NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.notify_on_new_group_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_group_name TEXT;
  v_member_id UUID;
BEGIN
  -- Get sender name
  SELECT display_name INTO v_sender_name FROM public.users WHERE id = NEW.sender_id;
  -- Get group name
  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id;

  -- Insert notifications for all members except sender
  FOR v_member_id IN 
    SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_member_id,
      'new_message',
      CASE WHEN NEW.shared_item IS NOT NULL THEN 'New Food Card' ELSE 'New Group Message' END,
      CASE 
        WHEN NEW.shared_item IS NOT NULL THEN v_sender_name || ' shared a card in ' || v_group_name
        ELSE v_sender_name || ' sent a message to ' || v_group_name
      END,
      jsonb_build_object(
        'group_id', NEW.group_id,
        'sender_id', NEW.sender_id,
        'has_attachment', NEW.shared_item IS NOT NULL,
        'item_name', CASE WHEN NEW.shared_item IS NOT NULL THEN NEW.shared_item->>'name' ELSE NULL END
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_group_message ON public.group_messages;
CREATE TRIGGER trg_notify_on_new_group_message
  AFTER INSERT ON public.group_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_group_message();


-- 2. FRIEND REQUEST NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  SELECT display_name INTO v_requester_name FROM public.users WHERE id = NEW.requester_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.requested_id,
    'friend_request',
    'New Friend Request',
    v_requester_name || ' wants to connect with you.',
    jsonb_build_object(
      'requester_id', NEW.requester_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_friend_request ON public.friend_requests;
CREATE TRIGGER trg_notify_on_friend_request
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_friend_request();


-- 3. POINTS EARNED NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.notify_on_points_earned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify for positive points
  IF NEW.points_delta > 0 THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'achievement',
      'Points Earned!',
      'You earned ' || NEW.points_delta || ' points for ' || REPLACE(NEW.action_type, '_', ' ') || '.',
      jsonb_build_object(
        'ledger_id', NEW.id,
        'points', NEW.points_delta,
        'action', NEW.action_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_points_earned ON public.user_points_ledger;
CREATE TRIGGER trg_notify_on_points_earned
  AFTER INSERT ON public.user_points_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_points_earned();
