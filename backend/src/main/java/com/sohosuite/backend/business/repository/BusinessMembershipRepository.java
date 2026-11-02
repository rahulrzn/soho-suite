package com.sohosuite.backend.business.repository;

import com.sohosuite.backend.business.entity.BusinessMembership;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BusinessMembershipRepository extends JpaRepository<BusinessMembership, Long> {
    @Query("select m from BusinessMembership m join fetch m.business where m.user.firebaseUid = :firebaseUid order by m.id")
    List<BusinessMembership> findAllForFirebaseUser(@Param("firebaseUid") String firebaseUid);

    @Query("select m from BusinessMembership m join fetch m.business where m.user.firebaseUid = :firebaseUid and m.business.id = :businessId")
    Optional<BusinessMembership> findForFirebaseUserAndBusiness(@Param("firebaseUid") String firebaseUid,
            @Param("businessId") Long businessId);

    @Query("select m from BusinessMembership m join fetch m.user where m.business.id = :businessId order by m.id")
    List<BusinessMembership> findAllForBusiness(@Param("businessId") Long businessId);

    Optional<BusinessMembership> findByUser_IdAndBusiness_Id(Long userId, Long businessId);

    boolean existsByUser_IdAndBusiness_Id(Long userId, Long businessId);

    List<BusinessMembership> findAllByUser_IdOrderById(Long userId);

}
