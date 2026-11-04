package com.sohosuite.backend.analytics;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.analytics.dto.BusinessHealthInputRequest;
import com.sohosuite.backend.analytics.service.BusinessHealthInputService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class BusinessHealthInputServiceTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final BusinessHealthInputService service = new BusinessHealthInputService(jdbc, memberships, mock(BusinessActivityService.class));
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);

    @Test
    void viewersCannotSaveFinancialHealthInputs() {
        BusinessMembership viewer = new BusinessMembership();
        viewer.setRole(BusinessRole.VIEWER);
        when(memberships.findForFirebaseUserAndBusiness("uid", 9L)).thenReturn(Optional.of(viewer));

        assertThrows(BusinessAccessDeniedException.class, () -> service.save(identity, 9L, request(
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-31"), BigDecimal.TEN)));
        verifyNoInteractions(jdbc);
    }

    @Test
    void rejectsReversedAndOverlongDateRangesBeforeDatabaseAccess() {
        assertThrows(IllegalArgumentException.class, () -> service.save(identity, 9L, request(
                LocalDate.parse("2026-02-01"), LocalDate.parse("2026-01-31"), BigDecimal.TEN)));
        assertThrows(IllegalArgumentException.class, () -> service.save(identity, 9L, request(
                LocalDate.parse("2025-01-01"), LocalDate.parse("2026-01-02"), BigDecimal.TEN)));
        verifyNoInteractions(jdbc, memberships);
    }

    @Test
    void rejectsNegativeMoneyInputsBeforeDatabaseAccess() {
        assertThrows(IllegalArgumentException.class, () -> service.save(identity, 9L, request(
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-31"), new BigDecimal("-1"))));
        verifyNoInteractions(jdbc, memberships);
    }

    private static BusinessHealthInputRequest request(LocalDate from, LocalDate to, BigDecimal amount) {
        return new BusinessHealthInputRequest(from, to, amount, amount, amount);
    }
}
