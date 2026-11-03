package com.sohosuite.backend.analytics.service;

import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.dto.SalesTrendPoint;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Calculates deterministic metrics from explicitly mapped order-line values. */
public final class SalesMetricsCalculator {

    public static final int MAX_RANGE_DAYS = 366;
    private static final Pattern DECIMAL = Pattern.compile("[-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)");

    private final LocalDate from;
    private final LocalDate to;
    private final String currencyCode;
    private final int dateIndex;
    private final int amountIndex;
    private final int orderIdIndex;
    private final Integer customerIdIndex;
    private final PeriodData current = new PeriodData();
    private final PeriodData previous = new PeriodData();
    private final LocalDate previousFrom;
    private final LocalDate previousTo;
    private int invalidDateRows;
    private final String previousRangeError;

    public SalesMetricsCalculator(
            LocalDate from,
            LocalDate to,
            String currencyCode,
            int dateIndex,
            int amountIndex,
            int orderIdIndex,
            Integer customerIdIndex) {
        validateDateRange(from, to);
        if (currencyCode == null || currencyCode.isBlank()) {
            throw new IllegalArgumentException("A confirmed currency is required");
        }
        if (dateIndex < 0 || amountIndex < 0 || orderIdIndex < 0
                || dateIndex == amountIndex || dateIndex == orderIdIndex || amountIndex == orderIdIndex
                || customerIdIndex != null && (customerIdIndex < 0
                    || customerIdIndex == dateIndex || customerIdIndex == amountIndex
                    || customerIdIndex == orderIdIndex)) {
            throw new IllegalArgumentException("Mapped columns must be distinct valid column positions");
        }
        this.from = from;
        this.to = to;
        this.currencyCode = currencyCode;
        this.dateIndex = dateIndex;
        this.amountIndex = amountIndex;
        this.orderIdIndex = orderIdIndex;
        this.customerIdIndex = customerIdIndex;

        LocalDate calculatedPreviousFrom = null;
        LocalDate calculatedPreviousTo = null;
        String rangeError = null;
        try {
            long previousDays = ChronoUnit.DAYS.between(from, to) + 1;
            calculatedPreviousTo = from.minusDays(1);
            calculatedPreviousFrom = calculatedPreviousTo.minusDays(previousDays - 1);
        } catch (DateTimeException exception) {
            rangeError = "The preceding comparison period is outside the supported calendar range";
        }
        this.previousFrom = calculatedPreviousFrom;
        this.previousTo = calculatedPreviousTo;
        this.previousRangeError = rangeError;
    }

    public static void validateDateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || to.isBefore(from)) {
            throw new IllegalArgumentException("The date range must have a start date on or before its end date");
        }
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("The inclusive date range cannot exceed 366 days");
        }
    }

    public void accept(List<String> values) {
        String dateText = cell(values, dateIndex);
        LocalDate date;
        try {
            if (dateText == null || dateText.isBlank()) throw new DateTimeParseException("Missing date", "", 0);
            date = LocalDate.parse(dateText.trim());
        } catch (DateTimeParseException exception) {
            invalidDateRows++;
            return;
        }

        if (!date.isBefore(from) && !date.isAfter(to)) {
            current.accept(values, date, amountIndex, orderIdIndex, customerIdIndex);
        } else if (previousFrom != null && !date.isBefore(previousFrom) && !date.isAfter(previousTo)) {
            previous.accept(values, date, amountIndex, orderIdIndex, customerIdIndex);
        }
    }

    public AnalyticsOverviewResponse finish() {
        MetricResult<BigDecimal> amount = amountMetric(current, "selected date range");
        MetricResult<Long> orders = orderMetric(current, "selected date range");
        MetricResult<BigDecimal> average = averageMetric(current);
        MetricResult<Long> customers = customerMetric(current);
        MetricResult<List<SalesTrendPoint>> trend = trendMetric(current);
        MetricResult<BigDecimal> change = changeMetric();
        return new AnalyticsOverviewResponse(null, null, from, to, currencyCode,
                amount, orders, average, customers, trend, change);
    }

    private MetricResult<BigDecimal> amountMetric(PeriodData period, String periodName) {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (period.rowCount == 0) return MetricResult.unavailable("No order-line rows exist in the " + periodName + ".");
        if (period.invalidAmounts > 0) {
            return MetricResult.incomplete(period.invalidAmounts + " row(s) have missing or invalid line amounts.");
        }
        return MetricResult.available(period.amount);
    }

    private MetricResult<Long> orderMetric(PeriodData period, String periodName) {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (period.rowCount == 0) return MetricResult.unavailable("No order-line rows exist in the " + periodName + ".");
        if (period.invalidOrderIds > 0) {
            return MetricResult.incomplete(period.invalidOrderIds + " row(s) have a missing order ID.");
        }
        return MetricResult.available((long) period.orderIds.size());
    }

    private MetricResult<BigDecimal> averageMetric(PeriodData period) {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (period.rowCount == 0) return MetricResult.unavailable("No order-line rows exist in the selected date range.");
        if (period.invalidAmounts > 0) {
            return MetricResult.incomplete(period.invalidAmounts + " row(s) have missing or invalid line amounts.");
        }
        if (period.invalidOrderIds > 0) {
            return MetricResult.incomplete(period.invalidOrderIds + " row(s) have a missing order ID.");
        }
        if (period.orderIds.isEmpty()) return MetricResult.unavailable("No distinct orders are available for the selected date range.");
        int fractionDigits = Math.max(0, Currency.getInstance(currencyCode).getDefaultFractionDigits());
        return MetricResult.available(period.amount.divide(BigDecimal.valueOf(period.orderIds.size()), fractionDigits,
                RoundingMode.HALF_UP));
    }

    private MetricResult<Long> customerMetric(PeriodData period) {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (customerIdIndex == null) return MetricResult.unavailable("No customer ID column is configured.");
        if (period.rowCount == 0) return MetricResult.unavailable("No order-line rows exist in the selected date range.");
        if (period.invalidCustomerIds > 0) {
            return MetricResult.incomplete(period.invalidCustomerIds + " row(s) have a missing customer ID.");
        }
        return MetricResult.available((long) period.customerIds.size());
    }

    private MetricResult<List<SalesTrendPoint>> trendMetric(PeriodData period) {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (period.rowCount == 0) return MetricResult.unavailable("No order-line rows exist in the selected date range.");
        if (period.invalidAmounts > 0) {
            return MetricResult.incomplete(period.invalidAmounts + " row(s) have missing or invalid line amounts.");
        }
        List<SalesTrendPoint> points = new ArrayList<>();
        for (LocalDate date = from; ; date = date.plusDays(1)) {
            points.add(new SalesTrendPoint(date, period.dailyAmounts.getOrDefault(date, BigDecimal.ZERO)));
            if (date.equals(to)) break;
        }
        return MetricResult.available(List.copyOf(points));
    }

    private MetricResult<BigDecimal> changeMetric() {
        String dateIssue = dateIssueReason();
        if (dateIssue != null) return MetricResult.incomplete(dateIssue);
        if (previousRangeError != null) return MetricResult.unavailable(previousRangeError);
        if (current.rowCount == 0 || previous.rowCount == 0) {
            return MetricResult.unavailable("Both the selected and immediately preceding periods need order-line data.");
        }
        if (current.invalidAmounts > 0 || previous.invalidAmounts > 0) {
            return MetricResult.incomplete("The selected or preceding period contains missing or invalid line amounts.");
        }
        if (previous.amount.signum() == 0) {
            return MetricResult.unavailable("Sales change is undefined because the preceding period total is zero.");
        }
        BigDecimal change = current.amount.subtract(previous.amount)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous.amount, 4, RoundingMode.HALF_UP);
        return MetricResult.available(change);
    }

    private String dateIssueReason() {
        return invalidDateRows == 0 ? null
                : invalidDateRows + " row(s) have a missing or invalid ISO date, so their period is unknown.";
    }

    private static String cell(List<String> values, int index) {
        return values == null || index >= values.size() ? null : values.get(index);
    }

    private static final class PeriodData {
        private int rowCount;
        private int invalidAmounts;
        private int invalidOrderIds;
        private int invalidCustomerIds;
        private BigDecimal amount = BigDecimal.ZERO;
        private final Set<String> orderIds = new HashSet<>();
        private final Set<String> customerIds = new HashSet<>();
        private final Map<LocalDate, BigDecimal> dailyAmounts = new HashMap<>();

        private void accept(
                List<String> values,
                LocalDate date,
                int amountIndex,
                int orderIdIndex,
                Integer customerIdIndex) {
            rowCount++;
            BigDecimal parsedAmount = parseAmount(cell(values, amountIndex));
            if (parsedAmount == null) {
                invalidAmounts++;
            } else {
                amount = amount.add(parsedAmount);
                dailyAmounts.merge(date, parsedAmount, BigDecimal::add);
            }

            String orderId = normalizedId(cell(values, orderIdIndex));
            if (orderId == null) invalidOrderIds++;
            else orderIds.add(orderId);

            if (customerIdIndex != null) {
                String customerId = normalizedId(cell(values, customerIdIndex));
                if (customerId == null) invalidCustomerIds++;
                else customerIds.add(customerId);
            }
        }

        private static BigDecimal parseAmount(String value) {
            if (value == null) return null;
            String normalized = value.trim();
            if (normalized.isEmpty() || normalized.length() > 64 || !DECIMAL.matcher(normalized).matches()) return null;
            try {
                return new BigDecimal(normalized);
            } catch (NumberFormatException exception) {
                return null;
            }
        }

        private static String normalizedId(String value) {
            if (value == null || value.isBlank()) return null;
            return value.trim();
        }
    }
}
