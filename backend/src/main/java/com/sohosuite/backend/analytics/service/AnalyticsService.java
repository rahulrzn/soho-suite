package com.sohosuite.backend.analytics.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigRequest;
import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigResponse;
import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.analytics.entity.DatasetAnalyticsConfiguration;
import com.sohosuite.backend.analytics.repository.DatasetAnalyticsConfigurationRepository;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.entity.DatasetRow;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.io.IOException;
import java.time.LocalDate;
import java.util.Currency;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AnalyticsService {

    private static final int ROWS_PER_PAGE = 100;
    private static final long MAX_DATASET_ROWS = 20_000;
    private static final TypeReference<List<String>> ROW_TYPE = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> COLUMNS_TYPE = new TypeReference<>() {};

    private final BusinessMembershipRepository memberships;
    private final DatasetRepository datasets;
    private final DatasetRowRepository rows;
    private final DatasetAnalyticsConfigurationRepository configurations;
    private final BusinessActivityService activity;
    private final ObjectMapper json = new ObjectMapper();

    public AnalyticsService(
            BusinessMembershipRepository memberships,
            DatasetRepository datasets,
            DatasetRowRepository rows,
            DatasetAnalyticsConfigurationRepository configurations,
            BusinessActivityService activity) {
        this.memberships = memberships;
        this.datasets = datasets;
        this.rows = rows;
        this.configurations = configurations;
        this.activity = activity;
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public AnalyticsDatasetConfigResponse configure(
            VerifiedFirebaseIdentity identity,
            Long businessId,
            AnalyticsDatasetConfigRequest request) {
        BusinessMembership actor = member(identity, businessId);
        requireWriter(actor);
        if (request == null || request.datasetId() == null || request.confirmedCurrency() == null) {
            throw new IllegalArgumentException("Dataset mapping and currency confirmation are required");
        }

        Dataset dataset = findBusinessDataset(businessId, request.datasetId());
        if (!"IMPORTED".equals(dataset.getStatus())) {
            throw new IllegalArgumentException("Analytics can only use a confirmed imported dataset");
        }

        String dateColumn = requiredColumn(request.dateColumn(), "date");
        String amountColumn = requiredColumn(request.lineAmountColumn(), "line amount");
        String orderColumn = requiredColumn(request.orderIdColumn(), "order ID");
        String customerColumn = optionalColumn(request.customerIdColumn());
        validateDistinctMappings(dateColumn, amountColumn, orderColumn, customerColumn);
        Map<String, Integer> columnIndexes = columnIndexes(dataset);
        requireMappedColumn(columnIndexes, dateColumn);
        requireMappedColumn(columnIndexes, amountColumn);
        requireMappedColumn(columnIndexes, orderColumn);
        if (customerColumn != null) requireMappedColumn(columnIndexes, customerColumn);

        String businessCurrency = actor.getBusiness().getBusinessCurrency();
        if (!request.confirmedCurrency().equals(businessCurrency)) {
            throw new IllegalArgumentException("Confirmed currency must exactly match the business currency");
        }
        try {
            requireCurrency(businessCurrency);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("The business currency is not a recognized ISO 4217 code");
        }

        DatasetAnalyticsConfiguration config = configurations.findByBusinessId(businessId)
                .orElseGet(DatasetAnalyticsConfiguration::new);
        config.setBusinessId(businessId);
        config.setDatasetId(dataset.getId());
        config.setDateColumn(dateColumn);
        config.setLineAmountColumn(amountColumn);
        config.setOrderIdColumn(orderColumn);
        config.setCustomerIdColumn(customerColumn);
        config.setConfirmedCurrency(businessCurrency);
        DatasetAnalyticsConfiguration saved = configurations.save(config);
        activity.record(businessId, actor.getUser().getId(), "ANALYTICS_CONFIGURED", "DATASET",
                saved.getDatasetId().toString(), "Business analytics configuration updated");
        return toConfigResponse(saved);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public AnalyticsOverviewResponse overview(
            VerifiedFirebaseIdentity identity,
            Long businessId,
            LocalDate from,
            LocalDate to) {
        BusinessMembership actor = member(identity, businessId);
        SalesMetricsCalculator.validateDateRange(from, to);
        String businessCurrency = actor.getBusiness().getBusinessCurrency();

        Optional<DatasetAnalyticsConfiguration> configured = configurations.findByBusinessId(businessId);
        if (configured.isEmpty()) {
            return unavailableResponse(null, from, to, businessCurrency,
                    "Analytics has not been configured for this business.");
        }

        DatasetAnalyticsConfiguration config = configured.get();
        Dataset dataset = findBusinessDataset(businessId, config.getDatasetId());
        if (!"IMPORTED".equals(dataset.getStatus())) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The configured dataset is no longer a confirmed import.");
        }
        if (!businessCurrency.equals(config.getConfirmedCurrency())) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The business currency changed; confirm the dataset currency again.");
        }
        try {
            requireCurrency(businessCurrency);
        } catch (IllegalArgumentException exception) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The business currency is not a recognized ISO 4217 code.");
        }

        Map<String, Integer> columnIndexes;
        try {
            columnIndexes = columnIndexes(dataset);
        } catch (IllegalArgumentException exception) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The configured dataset column schema is unavailable.");
        }
        Integer dateIndex = columnIndexes.get(config.getDateColumn());
        Integer amountIndex = columnIndexes.get(config.getLineAmountColumn());
        Integer orderIdIndex = columnIndexes.get(config.getOrderIdColumn());
        Integer customerIdIndex = config.getCustomerIdColumn() == null
                ? null : columnIndexes.get(config.getCustomerIdColumn());
        if (dateIndex == null || amountIndex == null || orderIdIndex == null
                || config.getCustomerIdColumn() != null && customerIdIndex == null) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "One or more configured columns no longer exist in the dataset.");
        }

        long rowCount = rows.countByDatasetId(dataset.getId());
        if (rowCount > MAX_DATASET_ROWS) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The dataset exceeds the 20,000-row analytics limit.");
        }
        if (rowCount != dataset.getRowCount()) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The stored row count does not match the dataset metadata.");
        }

        SalesMetricsCalculator calculator = new SalesMetricsCalculator(
                from, to, businessCurrency, dateIndex, amountIndex, orderIdIndex, customerIdIndex);
        long loadedRows = 0;
        int pages = (int) ((rowCount + ROWS_PER_PAGE - 1) / ROWS_PER_PAGE);
        for (int page = 0; page < pages; page++) {
            List<DatasetRow> pageRows = rows.findAllByDatasetIdOrderByRowNumber(
                    dataset.getId(), PageRequest.of(page, ROWS_PER_PAGE));
            if (pageRows.isEmpty()) break;
            for (DatasetRow row : pageRows) {
                loadedRows++;
                List<String> values;
                try {
                    values = json.readValue(row.getValuesJson(), ROW_TYPE);
                } catch (IOException exception) {
                    calculator.accept(null);
                    continue;
                }
                calculator.accept(values);
            }
        }
        if (loadedRows != rowCount) {
            return unavailableResponse(dataset, from, to, businessCurrency,
                    "The stored dataset rows could not be read completely.");
        }
        return withDataset(calculator.finish(), dataset);
    }

    private BusinessMembership member(VerifiedFirebaseIdentity identity, Long businessId) {
        if (identity == null || identity.uid() == null || businessId == null) {
            throw new BusinessAccessDeniedException();
        }
        return memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId)
                .orElseThrow(BusinessAccessDeniedException::new);
    }

    private void requireWriter(BusinessMembership actor) {
        if (actor.getRole() != BusinessRole.OWNER && actor.getRole() != BusinessRole.MANAGER) {
            throw new BusinessAccessDeniedException();
        }
    }

    private Dataset findBusinessDataset(Long businessId, Long datasetId) {
        return datasets.findByBusinessIdAndId(businessId, datasetId)
                .orElseThrow(() -> new NoSuchElementException("Dataset not found"));
    }

    private String requiredColumn(String value, String label) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("A mapped " + label + " column is required");
        String trimmed = value.trim();
        if (trimmed.length() > 120) throw new IllegalArgumentException("Mapped column names cannot exceed 120 characters");
        return trimmed;
    }

    private String optionalColumn(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if (trimmed.length() > 120) throw new IllegalArgumentException("Mapped column names cannot exceed 120 characters");
        return trimmed;
    }

    private void validateDistinctMappings(String date, String amount, String orderId, String customerId) {
        Set<String> mapped = new HashSet<>(List.of(date, amount, orderId));
        if (mapped.size() != 3 || customerId != null && !mapped.add(customerId)) {
            throw new IllegalArgumentException("Each analytics role must use a different dataset column");
        }
    }

    private Map<String, Integer> columnIndexes(Dataset dataset) {
        List<Map<String, Object>> columns;
        try {
            columns = json.readValue(dataset.getColumnsJson(), COLUMNS_TYPE);
            if (columns == null) throw new IllegalArgumentException("Dataset columns are missing");
        } catch (IOException | RuntimeException exception) {
            throw new IllegalArgumentException("Dataset column schema is invalid");
        }
        Map<String, Integer> indexes = new java.util.LinkedHashMap<>();
        for (int index = 0; index < columns.size(); index++) {
            Map<String, Object> column = columns.get(index);
            if (column == null) throw new IllegalArgumentException("Dataset column entry is invalid");
            Object name = column.get("name");
            if (name instanceof String stringName && !stringName.isBlank()) {
                if (indexes.putIfAbsent(stringName, index) != null) {
                    throw new IllegalArgumentException("Dataset column names are ambiguous");
                }
            }
        }
        return indexes;
    }

    private void requireMappedColumn(Map<String, Integer> indexes, String name) {
        if (!indexes.containsKey(name)) {
            throw new IllegalArgumentException("Mapped column does not exist in the selected dataset");
        }
    }

    private AnalyticsDatasetConfigResponse toConfigResponse(DatasetAnalyticsConfiguration config) {
        return new AnalyticsDatasetConfigResponse(config.getDatasetId(), config.getDateColumn(),
                config.getLineAmountColumn(), config.getOrderIdColumn(), config.getCustomerIdColumn(),
                config.getConfirmedCurrency(), config.getUpdatedAt());
    }

    private void requireCurrency(String currencyCode) {
        if (Currency.getInstance(currencyCode).getDefaultFractionDigits() < 0) {
            throw new IllegalArgumentException("The business currency has no ISO 4217 minor-unit definition");
        }
    }

    private AnalyticsOverviewResponse withDataset(AnalyticsOverviewResponse metrics, Dataset dataset) {
        return new AnalyticsOverviewResponse(dataset.getId(), dataset.getName(), metrics.from(), metrics.to(),
                metrics.currency(), metrics.totalSalesAmount(), metrics.distinctOrderCount(),
                metrics.averageOrderValue(), metrics.distinctCustomerCount(), metrics.dailySalesTrend(),
                metrics.salesChangePercent());
    }

    private AnalyticsOverviewResponse unavailableResponse(
            Dataset dataset, LocalDate from, LocalDate to, String currency, String reason) {
        return new AnalyticsOverviewResponse(
                dataset == null ? null : dataset.getId(),
                dataset == null ? null : dataset.getName(),
                from,
                to,
                currency,
                MetricResult.unavailable(reason),
                MetricResult.unavailable(reason),
                MetricResult.unavailable(reason),
                MetricResult.unavailable(reason),
                MetricResult.unavailable(reason),
                MetricResult.unavailable(reason));
    }
}
