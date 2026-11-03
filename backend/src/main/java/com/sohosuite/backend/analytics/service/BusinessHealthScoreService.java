package com.sohosuite.backend.analytics.service;

import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.analytics.dto.HealthScoreComponent;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.dto.MetricStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;

@Service
public class BusinessHealthScoreService {
    private static final String FORMULA = "clamp(50 + salesChangePercent, 0, 100)";
    private static final String LIMITATIONS = "This score reflects only the change in imported sales "
            + "against the immediately preceding equal-length period. It does not measure absolute "
            + "business performance, expenses, cash flow, debt, inventory demand, or business viability; "
            + "it is not an audited assessment, credit score, investment recommendation, or certification.";
    private final AnalyticsService analytics;

    public BusinessHealthScoreService(AnalyticsService analytics) { this.analytics = analytics; }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessHealthScoreResponse score(VerifiedFirebaseIdentity identity, long businessId,
            LocalDate from, LocalDate to) {
        var overview = analytics.overview(identity, businessId, from, to);
        MetricResult<BigDecimal> change = overview.salesChangePercent();
        if (change.status() != MetricStatus.AVAILABLE) {
            return new BusinessHealthScoreResponse("INSUFFICIENT_DATA", null, overview.currency(), from, to,
                    List.of(new HealthScoreComponent("salesChange", 100, change.status(), null, FORMULA, change.reason())),
                    "A score is unavailable because a reliable sales change value is not available.", LIMITATIONS);
        }
        BigDecimal bounded = BigDecimal.valueOf(50).add(change.value()).setScale(0, RoundingMode.HALF_UP)
                .max(BigDecimal.ZERO).min(BigDecimal.valueOf(100));
        int score = bounded.intValueExact();
        String interpretation = score < 40 ? "Imported sales declined materially compared with the preceding period."
                : score > 60 ? "Imported sales increased compared with the preceding period."
                : "Imported sales were broadly stable compared with the preceding period.";
        return new BusinessHealthScoreResponse("AVAILABLE", score, overview.currency(), from, to,
                List.of(new HealthScoreComponent("salesChange", 100, MetricStatus.AVAILABLE, score, FORMULA,
                        "Sales change was " + change.value().toPlainString() + " percent.")),
                interpretation, LIMITATIONS);
    }
}
