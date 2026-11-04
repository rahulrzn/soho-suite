package com.sohosuite.backend.analytics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.analytics.service.BusinessHealthScoreService;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.expense.service.ExpenseService;
import com.sohosuite.backend.expense.dto.ExpenseSummaryResponse;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class BusinessHealthScoreServiceTests {
    private final AnalyticsService analytics = mock(AnalyticsService.class);
    private final ExpenseService expenses = mock(ExpenseService.class);
    private final DatasetRepository datasets = mock(DatasetRepository.class);
    private final BusinessHealthScoreService service = new BusinessHealthScoreService(analytics, expenses, datasets);
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);
    private final LocalDate from = LocalDate.parse("2026-01-01");
    private final LocalDate to = LocalDate.parse("2026-01-31");

    @Test
    void combinesImportedSalesRecordedExpensesAndDatasetFreshness() {
        when(analytics.overview(identity, 7L, from, to)).thenReturn(overview(MetricResult.available(new BigDecimal("25"))));
        when(expenses.summary(identity, 7L, from, to)).thenReturn(new ExpenseSummaryResponse(List.of(
                new ExpenseSummaryResponse.CurrencySummary("USD", new BigDecimal("310"), List.of()))));
        Dataset dataset = new Dataset();
        dataset.setImportedAt(Instant.now());
        when(datasets.findByBusinessIdAndId(7L, 1L)).thenReturn(Optional.of(dataset));

        BusinessHealthScoreResponse response = service.score(identity, 7L, from, to);

        assertEquals("AVAILABLE", response.status());
        assertEquals(5, response.components().size());
        assertEquals(100, response.components().stream().mapToInt(component -> component.weightPercent()).sum());
    }

    @Test
    void withholdsOverallScoreWhenAutomaticSignalsAreInsufficient() {
        when(analytics.overview(identity, 7L, from, to)).thenReturn(overview(MetricResult.incomplete("Invalid date rows")));
        when(expenses.summary(identity, 7L, from, to)).thenReturn(new ExpenseSummaryResponse(List.of()));

        BusinessHealthScoreResponse response = service.score(identity, 7L, from, to);

        assertEquals("INSUFFICIENT_DATA", response.status());
        assertNull(response.score());
        assertEquals("Invalid date rows", response.components().get(1).reason());
    }

    private static AnalyticsOverviewResponse overview(MetricResult<BigDecimal> change) {
        return new AnalyticsOverviewResponse(1L, "Dataset", LocalDate.parse("2026-01-01"),
                LocalDate.parse("2026-01-31"), "USD", MetricResult.available(new BigDecimal("1000")),
                MetricResult.unavailable("unused"), MetricResult.unavailable("unused"),
                MetricResult.unavailable("unused"), MetricResult.unavailable("unused"), change);
    }
}
