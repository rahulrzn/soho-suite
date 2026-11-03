package com.sohosuite.backend.report;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

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
}
