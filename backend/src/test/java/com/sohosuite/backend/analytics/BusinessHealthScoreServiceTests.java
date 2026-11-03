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
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BusinessHealthScoreServiceTests {
    private final AnalyticsService analytics = mock(AnalyticsService.class);
    private final BusinessHealthScoreService service = new BusinessHealthScoreService(analytics);
    private final VerifiedFirebaseIdentity identity = new VerifiedFirebaseIdentity("uid", "user@example.test", true);
    private final LocalDate from = LocalDate.parse("2026-01-01");
    private final LocalDate to = LocalDate.parse("2026-01-31");

    @Test
    void mapsSalesChangeToClampedDeterministicScore() {
        when(analytics.overview(identity, 7L, from, to)).thenReturn(overview(MetricResult.available(new BigDecimal("25.4"))));

        BusinessHealthScoreResponse response = service.score(identity, 7L, from, to);

        assertEquals("AVAILABLE", response.status());
        assertEquals(75, response.score());
        assertEquals(100, response.components().getFirst().weightPercent());
        assertEquals("USD", response.currency());
    }

    @Test
    void doesNotManufactureScoreWhenAnalyticsIsIncomplete() {
        when(analytics.overview(identity, 7L, from, to)).thenReturn(overview(MetricResult.incomplete("Invalid date rows")));

        BusinessHealthScoreResponse response = service.score(identity, 7L, from, to);

        assertEquals("INSUFFICIENT_DATA", response.status());
        assertNull(response.score());
        assertEquals("Invalid date rows", response.components().getFirst().reason());
        assertEquals("INCOMPLETE", response.components().getFirst().inputStatus().name());
    }

    @Test
    void clampsLargeChangesToTheDocumentedRange() {
        when(analytics.overview(identity, 7L, from, to)).thenReturn(overview(MetricResult.available(new BigDecimal("2500"))));
        assertEquals(100, service.score(identity, 7L, from, to).score());
    }

    private static AnalyticsOverviewResponse overview(MetricResult<BigDecimal> change) {
        return new AnalyticsOverviewResponse(1L, "Dataset", LocalDate.parse("2026-01-01"),
                LocalDate.parse("2026-01-31"), "USD", MetricResult.unavailable("unused"),
                MetricResult.unavailable("unused"), MetricResult.unavailable("unused"),
                MetricResult.unavailable("unused"), MetricResult.unavailable("unused"), change);
    }
}
