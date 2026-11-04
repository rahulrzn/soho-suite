package com.sohosuite.backend.analytics.service;

import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.expense.dto.ExpenseSummaryResponse;
import com.sohosuite.backend.expense.service.ExpenseService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessHealthScoreService {
    private final AnalyticsService analytics;
    private final ExpenseService expenses;
    private final DatasetRepository datasets;

    public BusinessHealthScoreService(AnalyticsService analytics, ExpenseService expenses, DatasetRepository datasets) {
        this.analytics = analytics;
        this.expenses = expenses;
        this.datasets = datasets;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessHealthScoreResponse score(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        var overview = analytics.overview(identity, businessId, from, to);
        var expenseSummary = expenses.summary(identity, businessId, from, to);
        Optional<BigDecimal> trackedExpenseTotal = expenseSummary.currencies().stream()
                .filter(summary -> summary.currency().equals(overview.currency()))
                .map(ExpenseSummaryResponse.CurrencySummary::total)
                .reduce(BigDecimal::add);
        LocalDate importedAt = overview.datasetId() == null ? null
                : datasets.findByBusinessIdAndId((long) businessId, overview.datasetId())
                        .map(dataset -> dataset.getImportedAt() == null ? null : dataset.getImportedAt().atZone(ZoneOffset.UTC).toLocalDate())
                        .orElse(null);
        return HealthScoreCalculator.calculate(overview, trackedExpenseTotal.orElse(null), importedAt, LocalDate.now(ZoneOffset.UTC));
    }
}
