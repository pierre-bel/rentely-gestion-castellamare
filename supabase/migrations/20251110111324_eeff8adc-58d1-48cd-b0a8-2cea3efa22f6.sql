-- Drop the old get_inbox_conversations function since it's replaced by search_inbox_conversations
DROP FUNCTION IF EXISTS public.get_inbox_conversations(uuid);