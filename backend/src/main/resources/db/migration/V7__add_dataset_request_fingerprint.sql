-- Preserve legacy datasets without claiming their original file payload is known.
ALTER TABLE public.dataset
    ADD COLUMN request_fingerprint varchar(64),
    ADD CONSTRAINT dataset_request_fingerprint_format_check
        CHECK (request_fingerprint IS NULL OR request_fingerprint ~ '^[0-9a-f]{64}$');
