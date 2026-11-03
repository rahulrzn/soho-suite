package com.sohosuite.backend.inventory;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.inventory.dto.InventoryItemRequest;
import com.sohosuite.backend.inventory.service.InventoryService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class InventoryServiceAuthorizationTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final InventoryService service = new InventoryService(jdbc, memberships, mock(BusinessActivityService.class));
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);

    @Test
    void viewerCannotCreateInventoryItems() {
        when(memberships.findForFirebaseUserAndBusiness("uid", 8L)).thenReturn(Optional.of(membership(BusinessRole.VIEWER)));

        assertThrows(BusinessAccessDeniedException.class,
                () -> service.create(identity, 8L, new InventoryItemRequest("Item", null, null, null)));
        verifyNoInteractions(jdbc);
    }

    private static BusinessMembership membership(BusinessRole role) {
        BusinessMembership membership = new BusinessMembership();
        membership.setRole(role);
        return membership;
    }
}
