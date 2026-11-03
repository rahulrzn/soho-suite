package com.sohosuite.backend.analytics.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record AnalyticsOverviewResponse(
        Long datasetId,
        String datasetName,
        LocalDate from,
        LocalDate to,
        String currency,
        MetricResult<BigDecimal> totalSalesAmount,
        MetricResult<Long> distinctOrderCount,
        MetricResult<BigDecimal> averageOrderValue,
        MetricResult<Long> distinctCustomerCount,
        MetricResult<List<SalesTrendPoint>> dailySalesTrend,
        MetricResult<BigDecimal> salesChangePercent) {}
