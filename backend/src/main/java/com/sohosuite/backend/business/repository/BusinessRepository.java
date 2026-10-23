package com.sohosuite.backend.business.repository;

import com.sohosuite.backend.business.entity.Business;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BusinessRepository extends JpaRepository<Business, Long> {
    @Query(value = "select nextval('public.business_code_seq')", nativeQuery = true)
    long nextBusinessCodeSequenceValue();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Business b where b.id = :id")
    Optional<Business> findForUpdateById(@Param("id") Long id);
}
