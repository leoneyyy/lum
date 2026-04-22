-- Lumiere realtime: ensure DELETE payloads carry the row we need to
-- decrement local reaction caches. Default REPLICA IDENTITY only returns
-- the primary key, which isn't enough for the client to locate the
-- (entry_id, user_id) pair that disappeared.

alter table public.reactions replica identity full;
