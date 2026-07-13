-- Study runs (reveal-as-you-go full mocks) carry an optional `reveal` flag on the attempt.
-- Nullable + additive: pre-existing rows read as NULL (an exam mock). Must be applied
-- before/with the code that serializes `reveal`, or an upsert carrying it fails.
alter table public.attempts add column reveal boolean;
