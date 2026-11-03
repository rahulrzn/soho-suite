package com.sohosuite.backend.activity;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.activity.repository.BusinessActivityRepository;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BusinessActivityServiceAuthorizationTests {
    private final BusinessActivityRepository events = mock(BusinessActivityRepository.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final BusinessActivityService service = new BusinessActivityService(events, memberships);

    @Test
    void nonMemberCannotReadAnotherBusinessActivity() {
        when(memberships.findForFirebaseUserAndBusiness("uid", 12L)).thenReturn(Optional.empty());

        assertThrows(BusinessAccessDeniedException.class, () -> service.list(
                new VerifiedFirebaseIdentity("uid", "user@example.test", true), 12L, 0, 20));
        verifyNoInteractions(events);
    }
}
