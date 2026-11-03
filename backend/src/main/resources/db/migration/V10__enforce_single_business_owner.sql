DO $$
BEGIN
    IF EXISTS (
        SELECT business_id
        FROM public.business_membership
        WHERE role = 'OWNER'
        GROUP BY business_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one owner per business: duplicate OWNER memberships require explicit review';
    END IF;
END;
$$;

CREATE UNIQUE INDEX business_membership_single_owner_uq
    ON public.business_membership (business_id)
    WHERE role = 'OWNER';
