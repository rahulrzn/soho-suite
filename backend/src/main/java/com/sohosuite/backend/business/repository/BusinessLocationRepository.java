package com.sohosuite.backend.business.repository;

import com.sohosuite.backend.business.entity.BusinessLocation;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BusinessLocationRepository extends JpaRepository<BusinessLocation, Long> {
    @Query("select l from BusinessLocation l where l.business.id = :businessId order by l.id")
    List<BusinessLocation> findAllForBusiness(@Param("businessId") Long businessId);

    @Query("select l from BusinessLocation l where l.business.id = :businessId and l.registeredAddress = true order by l.id")
    List<BusinessLocation> findRegisteredLocations(@Param("businessId") Long businessId);

    @Query("select count(l) > 0 from BusinessLocation l where l.business.id = :businessId and lower(l.locationCode) = lower(:code) and (:excludeId is null or l.id <> :excludeId)")
    boolean codeExists(@Param("businessId") Long businessId, @Param("code") String code, @Param("excludeId") Long excludeId);
}
