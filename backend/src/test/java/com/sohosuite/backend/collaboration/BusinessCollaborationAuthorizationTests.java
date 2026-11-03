package com.sohosuite.backend.collaboration;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.collaboration.dto.CreateInvitationRequest;
import com.sohosuite.backend.collaboration.service.BusinessCollaborationService;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class BusinessCollaborationAuthorizationTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final BusinessCollaborationService service = new BusinessCollaborationService(jdbc, memberships,
            mock(UserRepository.class), mock(BusinessActivityService.class));

    @Test
    void managerCannotCreateOwnerInvitation() {
        long businessId = 15L;
        doReturn(List.of(businessId)).when(jdbc).query(anyString(), any(RowMapper.class), eq(businessId));
        BusinessMembership manager = new BusinessMembership(); manager.setRole(BusinessRole.MANAGER);
        when(memberships.findForFirebaseUserAndBusiness("uid", businessId)).thenReturn(Optional.of(manager));
        VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "manager@example.test", true);

        assertThrows(BusinessAccessDeniedException.class, () -> service.createInvitation(identity, businessId,
                new CreateInvitationRequest("invitee@example.test", BusinessRole.VIEWER)));

        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
