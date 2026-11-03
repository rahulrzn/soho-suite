package com.sohosuite.backend.analytics.dto;

import java.time.Instant;

public record AnalyticsDatasetConfigResponse(
        Long datasetId,
        String dateColumn,
        String lineAmountColumn,
        String orderIdColumn,
        String customerIdColumn,
        String confirmedCurrency,
        Instant updatedAt) {}
