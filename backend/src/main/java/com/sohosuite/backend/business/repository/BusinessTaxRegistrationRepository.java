package com.sohosuite.backend.business.repository;

import com.sohosuite.backend.business.entity.BusinessTaxRegistration;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BusinessTaxRegistrationRepository extends JpaRepository<BusinessTaxRegistration, Long> {
    @Query("select r from BusinessTaxRegistration r where r.business.id = :businessId order by r.id")
    List<BusinessTaxRegistration> findAllForBusiness(@Param("businessId") Long businessId);

    @Query("select count(r) > 0 from BusinessTaxRegistration r where r.business.id = :businessId and lower(r.registrationType) = lower(:type) and lower(r.jurisdiction) = lower(:jurisdiction) and lower(r.registrationNumber) = lower(:number) and (:excludeId is null or r.id <> :excludeId)")
    boolean registrationExists(@Param("businessId") Long businessId, @Param("type") String type,
            @Param("jurisdiction") String jurisdiction, @Param("number") String number,
            @Param("excludeId") Long excludeId);
}
