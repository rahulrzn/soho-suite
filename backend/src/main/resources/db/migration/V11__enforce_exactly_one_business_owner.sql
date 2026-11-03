DO $$
BEGIN
    IF EXISTS (
        SELECT b.id
        FROM public.business b
        LEFT JOIN public.business_membership m ON m.business_id = b.id
        GROUP BY b.id
        HAVING count(m.id) FILTER (WHERE m.role = 'OWNER') <> 1
    ) THEN
        RAISE EXCEPTION 'Cannot enforce one OWNER per business: existing businesses require explicit membership review';
    END IF;
END;
$$;

CREATE FUNCTION public.check_business_membership_owner_invariant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    checked_business_id bigint;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        checked_business_id := OLD.business_id;
        IF EXISTS (SELECT 1 FROM public.business WHERE id = checked_business_id)
           AND (SELECT count(*) FROM public.business_membership WHERE business_id = checked_business_id AND role = 'OWNER') <> 1 THEN
            RAISE EXCEPTION 'A business must have exactly one OWNER membership';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        checked_business_id := NEW.business_id;
        IF EXISTS (SELECT 1 FROM public.business WHERE id = checked_business_id)
           AND (SELECT count(*) FROM public.business_membership WHERE business_id = checked_business_id AND role = 'OWNER') <> 1 THEN
            RAISE EXCEPTION 'A business must have exactly one OWNER membership';
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.business_id <> OLD.business_id THEN
        checked_business_id := NEW.business_id;
        IF EXISTS (SELECT 1 FROM public.business WHERE id = checked_business_id)
           AND (SELECT count(*) FROM public.business_membership WHERE business_id = checked_business_id AND role = 'OWNER') <> 1 THEN
            RAISE EXCEPTION 'A business must have exactly one OWNER membership';
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER business_membership_owner_invariant
AFTER INSERT OR UPDATE OR DELETE ON public.business_membership
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_business_membership_owner_invariant();

CREATE FUNCTION public.check_new_business_has_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.business WHERE id = NEW.id)
       AND (SELECT count(*) FROM public.business_membership WHERE business_id = NEW.id AND role = 'OWNER') <> 1 THEN
        RAISE EXCEPTION 'A business must have exactly one OWNER membership';
    END IF;
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER business_insert_owner_invariant
AFTER INSERT ON public.business
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.check_new_business_has_owner();
