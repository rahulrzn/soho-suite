package com.sohosuite.backend.analytics.service;

import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.analytics.dto.HealthScoreComponent;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.dto.MetricStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

final class HealthScoreCalculator {
    private static final String LIMITATIONS = "This is an automated directional estimate based on imported sales, recorded expenses, "
            + "and dataset import age. It uses a 55% operating-margin target and a 100-day freshness scale. "
            + "Expense records may be incomplete. Cash runway and inventory turnover are omitted unless their source data is available. "
            + "This is not an audited assessment, credit score, investment recommendation, or certification.";

    private HealthScoreCalculator() { }

    static BusinessHealthScoreResponse calculate(AnalyticsOverviewResponse overview, BigDecimal trackedExpenses,
            LocalDate datasetImportedAt, LocalDate today) {
        List<RawComponent> raw = new ArrayList<>();
        var sales = overview.totalSalesAmount();
        if (sales.status() == MetricStatus.AVAILABLE && sales.value().signum() > 0 && trackedExpenses != null) {
            BigDecimal marginPercent = sales.value().subtract(trackedExpenses).multiply(BigDecimal.valueOf(100))
                    .divide(sales.value(), 4, RoundingMode.HALF_UP);
            raw.add(available("profitability", clamp(marginPercent.multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(55), 0, RoundingMode.HALF_UP)),
                    "clamp(operatingMarginPercent / 55 * 100, 0, 100)", "Operating margin after recorded expenses was " + marginPercent.toPlainString() + " percent."));
        } else {
            String reason;
            if (sales.status() != MetricStatus.AVAILABLE) reason = sales.reason();
            else if (sales.value().signum() <= 0) reason = "No positive sales were found in this date range.";
            else reason = "Recorded expenses in the business currency are needed to calculate operating margin.";
            raw.add(missing("profitability", sales.status() == MetricStatus.INCOMPLETE ? MetricStatus.INCOMPLETE : MetricStatus.UNAVAILABLE, reason));
        }

        var growth = overview.salesChangePercent();
        if (growth.status() == MetricStatus.AVAILABLE) {
            raw.add(available("revenueGrowth", clamp(BigDecimal.valueOf(50).add(growth.value()).setScale(0, RoundingMode.HALF_UP)),
                    "clamp(50 + salesChangePercent, 0, 100)", "Sales changed by " + growth.value().toPlainString() + " percent."));
        } else {
            raw.add(missing("revenueGrowth", growth.status(), growth.reason()));
        }

        raw.add(missing("cashFlow", MetricStatus.UNAVAILABLE,
                "Cash balances are not tracked, so cash runway cannot be calculated automatically."));
        raw.add(missing("inventoryTurnover", MetricStatus.UNAVAILABLE,
                "Inventory costs are not tracked, so inventory turnover cannot be calculated automatically."));

        if (datasetImportedAt != null) {
            long ageDays = Math.max(0, ChronoUnit.DAYS.between(datasetImportedAt, today));
            raw.add(available("dataFreshness", clamp(BigDecimal.valueOf(100 - ageDays)), "clamp(100 - datasetAgeDays, 0, 100)",
                    "The configured dataset was imported " + ageDays + " days ago."));
        } else {
            raw.add(missing("dataFreshness", MetricStatus.UNAVAILABLE, "A confirmed analytics dataset is required to measure data freshness."));
        }

        List<RawComponent> available = raw.stream().filter(component -> component.score() != null).toList();
        boolean enoughData = available.size() >= 3;
        int score = enoughData ? (int) Math.round(available.stream().mapToInt(RawComponent::score).average().orElse(0)) : 0;
        int weight = available.isEmpty() ? 0 : 100 / available.size();
        int remainder = available.isEmpty() ? 0 : 100 - (weight * available.size());
        List<HealthScoreComponent> components = new ArrayList<>();
        boolean remainderAssigned = false;
        for (RawComponent item : raw) {
            int itemWeight = item.score() == null ? 0 : weight;
            if (item.score() != null && !remainderAssigned) { itemWeight += remainder; remainderAssigned = true; }
            components.add(new HealthScoreComponent(item.name(), itemWeight, item.status(), item.score(), item.formula(), item.reason()));
        }
        String interpretation = enoughData
                ? score < 40 ? "Several measured business signals need attention."
                    : score < 70 ? "Measured business signals are mixed; review the factors below."
                    : "The measured business signals are broadly healthy."
                : "Only " + available.size() + " of 5 health factors are available for this date range. A score appears when at least 3 factors can be calculated; review the missing requirements below.";
        return new BusinessHealthScoreResponse(enoughData ? "AVAILABLE" : "INSUFFICIENT_DATA", enoughData ? score : null,
                overview.currency(), overview.from(), overview.to(), components, interpretation, LIMITATIONS);
    }

    private static RawComponent available(String name, int score, String formula, String reason) {
        return new RawComponent(name, MetricStatus.AVAILABLE, score, formula, reason);
    }

    private static RawComponent missing(String name, MetricStatus status, String reason) {
        return new RawComponent(name, status, null, "", reason == null || reason.isBlank() ? "Required source data is unavailable." : reason);
    }

    private static int clamp(BigDecimal value) {
        return value.max(BigDecimal.ZERO).min(BigDecimal.valueOf(100)).intValue();
    }

    private record RawComponent(String name, MetricStatus status, Integer score, String formula, String reason) { }
}
