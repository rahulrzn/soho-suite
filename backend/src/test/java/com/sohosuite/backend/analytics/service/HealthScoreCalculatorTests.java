package com.sohosuite.backend.analytics.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class HealthScoreCalculatorTests {
    private final LocalDate from = LocalDate.parse("2026-01-01");
    private final LocalDate to = LocalDate.parse("2026-01-31");
    private final LocalDate today = LocalDate.parse("2026-02-08");

    @Test
    void calculatesAutomaticSignalsAndLeavesUnsupportedFactorsUnavailable() {
        BusinessHealthScoreResponse response = HealthScoreCalculator.calculate(overview(MetricResult.available(new BigDecimal("25"))),
                new BigDecimal("310"), LocalDate.parse("2026-01-31"), today);

        assertEquals("AVAILABLE", response.status());
        assertEquals(89, response.score());
        assertEquals(100, response.components().stream().mapToInt(component -> component.weightPercent()).sum());
        assertEquals(List.of("profitability", "revenueGrowth", "cashFlow", "inventoryTurnover", "dataFreshness"),
                response.components().stream().map(component -> component.name()).toList());
        assertEquals("UNAVAILABLE", response.components().get(2).inputStatus().name());
    }

    @Test
    void withholdsCompositeScoreUntilThreeComponentsAreSupported() {
        BusinessHealthScoreResponse response = HealthScoreCalculator.calculate(overview(MetricResult.incomplete("Invalid source dates")),
                null, null, today);

        assertEquals("INSUFFICIENT_DATA", response.status());
        assertNull(response.score());
        assertEquals("Invalid source dates", response.components().get(1).reason());
        assertEquals(0, response.components().stream().mapToInt(component -> component.weightPercent()).sum());
    }

    private AnalyticsOverviewResponse overview(MetricResult<BigDecimal> change) {
        return new AnalyticsOverviewResponse(1L, "Orders", from, to, "USD",
                MetricResult.available(new BigDecimal("1000")), MetricResult.unavailable("unused"),
                MetricResult.unavailable("unused"), MetricResult.unavailable("unused"),
                MetricResult.unavailable("unused"), change);
    }
}
