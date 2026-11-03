package com.sohosuite.backend.dataset.repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Repository;

/** Serializes first-use requests for the same business-scoped idempotency key. */
@Repository
public class DatasetIdempotencyLock {
    @PersistenceContext
    private EntityManager entityManager;

    public void lock(Long businessId, String idempotencyKey) {
        entityManager.createNativeQuery(
                        "SELECT pg_advisory_xact_lock(hashtextextended(CAST(:scope AS text), 0))")
                .setParameter("scope", businessId + ":" + idempotencyKey)
                .getSingleResult();
    }
}
