package com.sohosuite.backend.activity.service;

import com.sohosuite.backend.activity.dto.ActivityEventResponse;
import com.sohosuite.backend.activity.dto.ActivityPageResponse;
import com.sohosuite.backend.activity.entity.BusinessActivityEvent;
import com.sohosuite.backend.activity.repository.BusinessActivityRepository;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessActivityService {
    private static final int MAX_PAGE_SIZE = 100;
    private final BusinessActivityRepository events;
    private final BusinessMembershipRepository memberships;

    public BusinessActivityService(BusinessActivityRepository events, BusinessMembershipRepository memberships) {
        this.events = events;
        this.memberships = memberships;
    }

    /** Called inside the enclosing mutation transaction. Summaries must never contain user data or row contents. */
    @Transactional
    public void record(Long businessId, Long actorUserId, String action, String targetType, String targetId, String summary) {
        events.append(businessId, actorUserId, safe(action, 80), safe(targetType, 40),
                safe(targetId, 80), safe(summary, 240));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ActivityPageResponse list(VerifiedFirebaseIdentity identity, long businessId, int page, int size) {
        if (identity == null || identity.uid() == null || page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("Invalid activity page request");
        }
        memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId)
                .orElseThrow(BusinessAccessDeniedException::new);
        if (page > 1_000_000) throw new IllegalArgumentException("Activity page exceeds the allowed limit");
        Page<BusinessActivityEvent> result = events.findAllByBusinessIdOrderByOccurredAtDescIdDesc(
                businessId, PageRequest.of(page, size));
        List<ActivityEventResponse> items = result.getContent().stream().map(event -> new ActivityEventResponse(
                event.getId(), event.getActorUserId(), event.getAction(), event.getTargetType(), event.getTargetId(),
                event.getSummary(), event.getOccurredAt())).toList();
        return new ActivityPageResponse(items, result.getTotalElements(), page, size);
    }

    private static String safe(String value, int max) {
        if (value == null) return null;
        String normalized = value.replaceAll("[\\p{Cntrl}]", " ").trim();
        return normalized.length() > max ? normalized.substring(0, max) : normalized;
    }
}
