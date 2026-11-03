package com.sohosuite.backend.activity.repository;

import com.sohosuite.backend.activity.entity.BusinessActivityEvent;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** Insert and read only. Application flows cannot update or delete an activity event through this repository. */
public interface BusinessActivityRepository extends Repository<BusinessActivityEvent, Long> {
    @Modifying
    @Query(value = "insert into public.business_activity (business_id, actor_user_id, action, target_type, target_id, summary) values (:businessId, :actorUserId, :action, :targetType, :targetId, :summary)", nativeQuery = true)
    int append(@Param("businessId") Long businessId, @Param("actorUserId") Long actorUserId,
            @Param("action") String action, @Param("targetType") String targetType,
            @Param("targetId") String targetId, @Param("summary") String summary);

    Page<BusinessActivityEvent> findAllByBusinessIdOrderByOccurredAtDescIdDesc(Long businessId, Pageable pageable);
}
