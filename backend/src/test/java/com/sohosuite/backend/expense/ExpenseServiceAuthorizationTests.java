package com.sohosuite.backend.expense;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.expense.dto.ExpenseRequest;
import com.sohosuite.backend.expense.service.ExpenseService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ExpenseServiceAuthorizationTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
    private final ExpenseService service = new ExpenseService(jdbc, memberships, mock(BusinessActivityService.class));
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);

    @Test
    void viewerCannotCreateExpense() {
        BusinessMembership viewer = new BusinessMembership(); viewer.setRole(BusinessRole.VIEWER);
        when(memberships.findForFirebaseUserAndBusiness("uid", 9L)).thenReturn(Optional.of(viewer));
        ExpenseRequest request = new ExpenseRequest(LocalDate.parse("2026-01-01"), BigDecimal.ONE,
                com.sohosuite.backend.expense.dto.ExpenseCategory.OTHER, "Supplies", null);

        assertThrows(BusinessAccessDeniedException.class, () -> service.create(identity, 9L, request));
        verifyNoInteractions(jdbc);
    }

    @Test
    void emptyExpenseSummaryReturnsNoCurrenciesAndNonMemberCannotRead() {
        BusinessMembership member = new BusinessMembership(); member.setRole(BusinessRole.VIEWER);
        when(memberships.findForFirebaseUserAndBusiness("uid", 9L)).thenReturn(Optional.of(member));
        when(jdbc.queryForList(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.eq(9L),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull())).thenReturn(List.of());

        assertEquals(List.of(), service.summary(identity, 9L, null, null).currencies());
        when(memberships.findForFirebaseUserAndBusiness("uid", 10L)).thenReturn(Optional.empty());
        assertThrows(BusinessAccessDeniedException.class, () -> service.summary(identity, 10L, null, null));
    }
}
