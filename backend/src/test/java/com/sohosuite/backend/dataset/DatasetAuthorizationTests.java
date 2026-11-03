package com.sohosuite.backend.dataset;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import com.sohosuite.backend.business.entity.Business;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.dataset.repository.DatasetIdempotencyLock;
import com.sohosuite.backend.dataset.service.DatasetService;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.entity.User;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class DatasetAuthorizationTests {
    private DatasetRepository datasets;
    private DatasetRowRepository rows;
    private BusinessMembershipRepository memberships;
    private DatasetIdempotencyLock idempotencyLock;
    private DatasetService service;
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("firebase-user", "owner@example.test", true);

    @BeforeEach void setUp() {
        datasets = mock(DatasetRepository.class);
        rows = mock(DatasetRowRepository.class);
        memberships = mock(BusinessMembershipRepository.class);
        idempotencyLock = mock(DatasetIdempotencyLock.class);
        service = new DatasetService(datasets, rows, memberships, idempotencyLock,
                mock(com.sohosuite.backend.activity.service.BusinessActivityService.class));
    }

    @Test void viewerCannotCreateImport() {
        when(memberships.findForFirebaseUserAndBusiness("firebase-user", 8L))
                .thenReturn(Optional.of(member(8L, BusinessRole.VIEWER)));
        assertThrows(BusinessAccessDeniedException.class,
                () -> service.upload(identity, 8L, null, null, null, "retry-1"));
        verifyNoInteractions(datasets, rows);
    }

    @Test void memberCannotReadAnotherBusinessDatasetList() {
        when(memberships.findForFirebaseUserAndBusiness("firebase-user", 8L))
                .thenReturn(Optional.of(member(8L, BusinessRole.MANAGER)));
        assertCrossBusinessOperationsDenied();
    }

    @Test void viewerCanReadTheirBusinessDatasetList() {
        when(memberships.findForFirebaseUserAndBusiness("firebase-user", 8L))
                .thenReturn(Optional.of(member(8L, BusinessRole.VIEWER)));
        service.list(identity, 8L);
        verify(datasets).findAllByBusinessIdOrderByCreatedAtDesc(8L);
    }

    @Test void viewerCannotConfirmAnImport() {
        when(memberships.findForFirebaseUserAndBusiness("firebase-user", 8L))
                .thenReturn(Optional.of(member(8L, BusinessRole.VIEWER)));
        assertThrows(BusinessAccessDeniedException.class, () -> service.confirm(identity, 8L, 5L, List.of("col")));
        verifyNoInteractions(datasets);
    }

    private void assertCrossBusinessOperationsDenied() {
        assertThrows(BusinessAccessDeniedException.class, () -> service.list(identity, 9L));
        assertThrows(BusinessAccessDeniedException.class, () -> service.get(identity, 9L, 5L));
        assertThrows(BusinessAccessDeniedException.class, () -> service.pageRows(identity, 9L, 5L, 0, 20));
        assertThrows(BusinessAccessDeniedException.class, () -> service.upload(identity, 9L, null, null, null, "retry"));
        assertThrows(BusinessAccessDeniedException.class, () -> service.confirm(identity, 9L, 5L, List.of("col")));
        verifyNoInteractions(datasets, rows);
    }

    private BusinessMembership member(Long businessId, BusinessRole role) {
        Business business = new Business(); business.setId(businessId);
        User user = new User(); user.setId(4L); user.setFirebaseUid("firebase-user");
        BusinessMembership membership = new BusinessMembership(); membership.setBusiness(business);
        membership.setUser(user); membership.setRole(role); return membership;
    }
}
