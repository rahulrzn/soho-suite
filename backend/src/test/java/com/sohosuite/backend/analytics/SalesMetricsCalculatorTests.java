package com.sohosuite.backend.analytics;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.dto.MetricStatus;
import com.sohosuite.backend.analytics.service.SalesMetricsCalculator;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class SalesMetricsCalculatorTests {

    private static final LocalDate FROM = LocalDate.parse("2026-05-02");
    private static final LocalDate TO = LocalDate.parse("2026-05-03");

    @Test
    void calculatesInclusiveSalesOrdersAovCustomersTrendAndPreviousPeriodChange() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-01", "10.00", "OLD", "old-customer", ""));
        calculator.accept(row("2026-05-02", "10.00", "A", "customer-1", ""));
        calculator.accept(row("2026-05-02", "20.00", "A", "customer-1", ""));
        calculator.accept(row("2026-05-03", "30.00", "B", "customer-2", ""));
        calculator.accept(row("2026-05-04", "100.00", "AFTER", "after-customer", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertAvailableDecimal(result.totalSalesAmount(), "60.00");
        assertAvailable(result.distinctOrderCount(), 2L);
        assertAvailableDecimal(result.averageOrderValue(), "30.00");
        assertAvailable(result.distinctCustomerCount(), 2L);
        assertAvailableDecimal(result.salesChangePercent(), "500.0000");
        assertEquals(MetricStatus.AVAILABLE, result.dailySalesTrend().status());
        assertEquals(2, result.dailySalesTrend().value().size());
        assertEquals(FROM, result.dailySalesTrend().value().getFirst().date());
        assertEquals(new BigDecimal("30.00"), result.dailySalesTrend().value().getFirst().salesAmount());
        assertEquals(TO, result.dailySalesTrend().value().getLast().date());
        assertEquals(new BigDecimal("30.00"), result.dailySalesTrend().value().getLast().salesAmount());
    }

    @Test
    void emptyRangeDoesNotReportZeroAsAvailableSales() {
        AnalyticsOverviewResponse result = calculator(2, 3, 4, 5).finish();

        assertEquals(MetricStatus.UNAVAILABLE, result.totalSalesAmount().status());
        assertNull(result.totalSalesAmount().value());
        assertEquals(MetricStatus.UNAVAILABLE, result.distinctOrderCount().status());
        assertNull(result.distinctOrderCount().value());
        assertEquals(MetricStatus.UNAVAILABLE, result.salesChangePercent().status());
    }

    @Test
    void invalidAmountsMakeMonetaryMetricsIncompleteWithoutHidingValidOrderCounts() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "not-money", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.INCOMPLETE, result.totalSalesAmount().status());
        assertNull(result.totalSalesAmount().value());
        assertEquals(MetricStatus.INCOMPLETE, result.averageOrderValue().status());
        assertEquals(MetricStatus.INCOMPLETE, result.dailySalesTrend().status());
        assertAvailable(result.distinctOrderCount(), 1L);
        assertAvailable(result.distinctCustomerCount(), 1L);
    }

    @Test
    void invalidDatesMakePeriodMetricsIncompleteBecauseTheRowCannotBePlacedInTime() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026/05/02", "10.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.INCOMPLETE, result.totalSalesAmount().status());
        assertEquals(MetricStatus.INCOMPLETE, result.distinctOrderCount().status());
        assertEquals(MetricStatus.INCOMPLETE, result.distinctCustomerCount().status());
        assertEquals(MetricStatus.INCOMPLETE, result.dailySalesTrend().status());
        assertEquals(MetricStatus.INCOMPLETE, result.salesChangePercent().status());
    }

    @Test
    void missingOrderIdsMakeOrderCountAndAverageUnavailableAsIncomplete() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "10.00", " ", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertAvailableDecimal(result.totalSalesAmount(), "10.00");
        assertEquals(MetricStatus.INCOMPLETE, result.distinctOrderCount().status());
        assertEquals(MetricStatus.INCOMPLETE, result.averageOrderValue().status());
        assertAvailable(result.distinctCustomerCount(), 1L);
    }

    @Test
    void missingOptionalCustomerMappingReturnsUnavailableCustomerMetric() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, null);
        calculator.accept(row("2026-05-02", "10.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.UNAVAILABLE, result.distinctCustomerCount().status());
        assertNull(result.distinctCustomerCount().value());
    }

    @Test
    void missingCustomerIdsMakeOnlyTheCustomerMetricIncomplete() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "10.00", "A", " ", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertAvailableDecimal(result.totalSalesAmount(), "10.00");
        assertAvailable(result.distinctOrderCount(), 1L);
        assertEquals(MetricStatus.INCOMPLETE, result.distinctCustomerCount().status());
        assertNull(result.distinctCustomerCount().value());
    }

    @Test
    void zeroPreviousPeriodSalesMakesGrowthUnavailableInsteadOfInventingAPercentage() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-01", "0.00", "OLD", "old-customer", ""));
        calculator.accept(row("2026-05-02", "10.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertAvailableDecimal(result.totalSalesAmount(), "10.00");
        assertEquals(MetricStatus.UNAVAILABLE, result.salesChangePercent().status());
        assertNull(result.salesChangePercent().value());
    }

    @Test
    void trendUsesZeroForDaysWithoutRowsOnlyWhenThePeriodHasData() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "10.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.AVAILABLE, result.dailySalesTrend().status());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.dailySalesTrend().value().getLast().salesAmount()));
    }

    @Test
    void formattedAmountsWithGroupingOrExponentNotationAreIncomplete() {
        SalesMetricsCalculator calculator = calculator(2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "1,000.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.INCOMPLETE, result.totalSalesAmount().status());
        assertNull(result.totalSalesAmount().value());
    }

    @Test
    void averageUsesTheCurrencyMinorUnitPrecision() {
        SalesMetricsCalculator calculator = new SalesMetricsCalculator(
                FROM, TO, "JPY", 2, 3, 4, 5);
        calculator.accept(row("2026-05-02", "1.00", "A", "customer-1", ""));
        calculator.accept(row("2026-05-02", "2.00", "B", "customer-2", ""));

        assertAvailableDecimal(calculator.finish().averageOrderValue(), "2");
    }

    @Test
    void dailyTrendCanEndAtTheMaximumSupportedCalendarDate() {
        LocalDate lastDate = LocalDate.MAX;
        SalesMetricsCalculator calculator = new SalesMetricsCalculator(
                lastDate.minusDays(1), lastDate, "USD", 2, 3, 4, 5);
        calculator.accept(row(lastDate.toString(), "1.00", "A", "customer-1", ""));

        AnalyticsOverviewResponse result = calculator.finish();

        assertEquals(MetricStatus.AVAILABLE, result.dailySalesTrend().status());
        assertEquals(lastDate, result.dailySalesTrend().value().getLast().date());
    }

    @Test
    void rejectsReversedAndOverlongInclusiveDateRanges() {
        assertThrows(IllegalArgumentException.class, () -> new SalesMetricsCalculator(
                TO, FROM, "USD", 2, 3, 4, 5));
        assertThrows(IllegalArgumentException.class, () -> new SalesMetricsCalculator(
                LocalDate.parse("2025-01-01"), LocalDate.parse("2026-01-02"), "USD", 2, 3, 4, 5));
    }

    private SalesMetricsCalculator calculator(Integer customerIndex) {
        return calculator(2, 3, 4, customerIndex);
    }

    private SalesMetricsCalculator calculator(int dateIndex, int amountIndex, int orderIndex, Integer customerIndex) {
        return new SalesMetricsCalculator(FROM, TO, "USD", dateIndex, amountIndex, orderIndex, customerIndex);
    }

    private static List<String> row(String date, String amount, String orderId, String customerId, String unused) {
        return List.of("ignored-0", "ignored-1", date, amount, orderId, customerId);
    }

    private static <T> void assertAvailable(MetricResult<T> metric, T expected) {
        assertEquals(MetricStatus.AVAILABLE, metric.status());
        assertEquals(expected, metric.value());
        assertNull(metric.reason());
    }

    private static void assertAvailableDecimal(MetricResult<BigDecimal> metric, String expected) {
        assertEquals(MetricStatus.AVAILABLE, metric.status());
        assertEquals(0, new BigDecimal(expected).compareTo(metric.value()));
        assertNull(metric.reason());
    }
}
