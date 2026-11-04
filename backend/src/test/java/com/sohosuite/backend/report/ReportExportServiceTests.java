package com.sohosuite.backend.report;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;

class ReportExportServiceTests {
    @Test
    void csvEscapesFormulaLikeValuesAndQuotesCells() {
        String csv = new String(ReportExportService.csv(List.of(
                List.of("name", "value"),
                List.of("=HYPERLINK(\"https://example.test\")", "a,\"b\""),
                List.of("  @SUM(A1:A2)", "+1+1"),
                List.of("\t=1+1", "safe"),
                List.of("-1+CMD()", "ordinary"))), StandardCharsets.UTF_8);

        assertTrue(csv.startsWith("\uFEFF\"name\",\"value\""));
        assertTrue(csv.contains("\"'=HYPERLINK("));
        assertTrue(csv.contains("\"a,\"\"b\"\"\""));
        assertTrue(csv.contains("\"'  @SUM(A1:A2)\",\"'+1+1\""));
        assertTrue(csv.contains("\"'\t=1+1\",\"safe\""));
        assertTrue(csv.contains("\"'-1+CMD()\",\"ordinary\""));
    }

    @Test
    void emptyCsvExportRetainsAHeaderRow() {
        String csv = new String(ReportExportService.csv(List.of(List.of("id", "amount"))), StandardCharsets.UTF_8);
        assertTrue(csv.equals("\uFEFF\"id\",\"amount\"\r\n"));
    }

    @Test
    void exportRequiresBusinessMembershipBeforeReadingData() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
        AnalyticsService analytics = mock(AnalyticsService.class);
        ReportExportService service = new ReportExportService(jdbc, memberships, analytics);
        VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);
        when(memberships.findForFirebaseUserAndBusiness("uid", 31L)).thenReturn(Optional.empty());

        assertThrows(BusinessAccessDeniedException.class,
                () -> service.datasetRows(identity, 31L, 88L));
        assertThrows(BusinessAccessDeniedException.class,
                () -> service.analytics(identity, 31L, LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-01")));
        verifyNoInteractions(jdbc, analytics);
    }

    @Test
    void emptyExpenseSummaryReturnsHeaderOnlyCsv() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
        doReturn(Optional.of(new BusinessMembership())).when(memberships)
                .findForFirebaseUserAndBusiness("uid", 31L);
        doReturn(0L).when(jdbc).queryForObject(anyString(), eq(Long.class), any(Object[].class));
        doNothing().when(jdbc).query(anyString(), any(RowCallbackHandler.class), any(Object[].class));
        ReportExportService service = new ReportExportService(jdbc, memberships, mock(AnalyticsService.class));

        String csv = new String(service.expenseSummary(
                new VerifiedFirebaseIdentity("uid", "user@example.test", true), 31L, null, null),
                StandardCharsets.UTF_8);

        assertTrue(csv.equals("\uFEFF\"from\",\"to\",\"currency\",\"category\",\"amount\"\r\n"));
        verify(jdbc).query(anyString(), any(RowCallbackHandler.class), any(Object[].class));
    }

    @Test
    void expenseExportRejectsResultsAboveItsMaximumBeforeLoadingRows() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        BusinessMembershipRepository memberships = mock(BusinessMembershipRepository.class);
        doReturn(Optional.of(new BusinessMembership())).when(memberships)
                .findForFirebaseUserAndBusiness("uid", 31L);
        doReturn(5_001L).when(jdbc).queryForObject(anyString(), eq(Long.class), any(Object[].class));
        ReportExportService service = new ReportExportService(jdbc, memberships, mock(AnalyticsService.class));

        org.junit.jupiter.api.Assertions.assertThrows(com.sohosuite.backend.exception.ExportTooLargeException.class,
                () -> service.expenses(new VerifiedFirebaseIdentity("uid", "user@example.test", true),
                        31L, null, null));

        verify(jdbc, never()).query(anyString(), any(RowCallbackHandler.class), any(Object[].class));
    }
}
