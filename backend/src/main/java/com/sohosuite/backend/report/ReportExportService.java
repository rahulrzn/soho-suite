package com.sohosuite.backend.report;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.MetricResult;
import com.sohosuite.backend.analytics.dto.SalesTrendPoint;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.BusinessNotFoundException;
import com.sohosuite.backend.exception.ExportTooLargeException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class ReportExportService {
    private static final int MAX_EXPENSE_ROWS = 5_000;
    private static final int MAX_INVENTORY_ROWS = 5_000;
    private static final int MAX_MOVEMENT_ROWS = 10_000;
    private static final int MAX_DATASET_ROWS = 20_000;
    private static final TypeReference<List<Map<String, Object>>> COLUMNS = new TypeReference<>() { };
    private static final TypeReference<List<String>> VALUES = new TypeReference<>() { };

    private final JdbcTemplate jdbc;
    private final BusinessMembershipRepository memberships;
    private final AnalyticsService analytics;
    private final ObjectMapper json = new ObjectMapper();

    public ReportExportService(JdbcTemplate jdbc, BusinessMembershipRepository memberships,
            AnalyticsService analytics) {
        this.jdbc = jdbc; this.memberships = memberships; this.analytics = analytics;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] analytics(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        authorize(identity, businessId);
        AnalyticsOverviewResponse result = analytics.overview(identity, businessId, from, to);
        List<List<?>> rows = new ArrayList<>();
        rows.add(List.of("metric", "status", "value", "reason"));
        addMetric(rows, "totalSalesAmount", result.totalSalesAmount());
        addMetric(rows, "distinctOrderCount", result.distinctOrderCount());
        addMetric(rows, "averageOrderValue", result.averageOrderValue());
        addMetric(rows, "distinctCustomerCount", result.distinctCustomerCount());
        rows.add(List.of("dailySalesTrend", result.dailySalesTrend().status(), "",
                result.dailySalesTrend().reason() == null ? "" : result.dailySalesTrend().reason()));
        addMetric(rows, "salesChangePercent", result.salesChangePercent());
        for (SalesTrendPoint point : result.dailySalesTrend().value() == null
                ? List.<SalesTrendPoint>of() : result.dailySalesTrend().value()) {
            rows.add(List.of("dailySalesTrend:" + point.date(), result.dailySalesTrend().status(), point.salesAmount(), ""));
        }
        return csv(rows);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] expenses(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        authorize(identity, businessId);
        validateRange(from, to);
        String where = " from business_expense where business_id=? and (?::date is null or expense_date>=?) and (?::date is null or expense_date<=?)";
        long count = jdbc.queryForObject("select count(*)" + where, Long.class, businessId, from, from, to, to);
        enforceLimit(count, MAX_EXPENSE_ROWS);
        List<List<?>> rows = new ArrayList<>();
        rows.add(List.of("id", "date", "amount", "currency", "category", "description", "reference"));
        jdbc.query("select id,expense_date,amount,currency,category,description,reference" + where + " order by expense_date,id limit ?",
                rs -> rows.add(List.of(rs.getLong("id"), rs.getDate("expense_date").toLocalDate(), rs.getBigDecimal("amount"),
                        rs.getString("currency"), rs.getString("category"), nullSafe(rs.getString("description")), nullSafe(rs.getString("reference")))),
                businessId, from, from, to, to, MAX_EXPENSE_ROWS + 1);
        enforceLimit(rows.size() - 1L, MAX_EXPENSE_ROWS);
        return csv(rows);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] expenseSummary(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        authorize(identity, businessId);
        validateRange(from, to);
        String where = " from business_expense where business_id=? and (?::date is null or expense_date>=?) and (?::date is null or expense_date<=?)";
        long groups = jdbc.queryForObject("select count(*) from (select currency,category" + where + " group by currency,category) expense_groups",
                Long.class, businessId, from, from, to, to);
        enforceLimit(groups, 1_000);
        List<List<?>> rows = new ArrayList<>();
        rows.add(List.of("from", "to", "currency", "category", "amount"));
        jdbc.query("select currency,category,sum(amount) amount" + where + " group by currency,category order by currency,category limit ?",
                rs -> rows.add(List.of(from == null ? "" : from, to == null ? "" : to,
                        rs.getString("currency"), rs.getString("category"), rs.getBigDecimal("amount"))),
                businessId, from, from, to, to, 1_001);
        enforceLimit(rows.size() - 1L, 1_000);
        return csv(rows);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] inventory(VerifiedFirebaseIdentity identity, long businessId) {
        authorize(identity, businessId);
        long count = jdbc.queryForObject("select count(*) from inventory_item where business_id=?", Long.class, businessId);
        enforceLimit(count, MAX_INVENTORY_ROWS);
        List<List<?>> rows = new ArrayList<>();
        rows.add(List.of("id", "name", "sku", "description", "active", "quantity"));
        jdbc.query("select id,name,sku,description,active,quantity from inventory_item where business_id=? order by id limit ?",
                rs -> rows.add(List.of(rs.getLong("id"), rs.getString("name"), nullSafe(rs.getString("sku")),
                        nullSafe(rs.getString("description")), rs.getBoolean("active"), rs.getBigDecimal("quantity"))), businessId, MAX_INVENTORY_ROWS + 1);
        enforceLimit(rows.size() - 1L, MAX_INVENTORY_ROWS);
        return csv(rows);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] inventoryMovements(VerifiedFirebaseIdentity identity, long businessId, Long itemId) {
        authorize(identity, businessId);
        if (itemId != null && jdbc.queryForList("select id from inventory_item where business_id=? and id=?", businessId, itemId).isEmpty()) {
            throw new BusinessNotFoundException("Inventory item not found");
        }
        String where = " from inventory_movement where business_id=? and (?::bigint is null or item_id=?)";
        long count = jdbc.queryForObject("select count(*)" + where, Long.class, businessId, itemId, itemId);
        enforceLimit(count, MAX_MOVEMENT_ROWS);
        List<List<?>> rows = new ArrayList<>();
        rows.add(List.of("id", "itemId", "type", "quantityDelta", "resultingQuantity", "reason", "occurredAt"));
        jdbc.query("select id,item_id,movement_type,quantity_delta,resulting_quantity,reason,occurred_at" + where + " order by occurred_at,id limit ?",
                rs -> rows.add(List.of(rs.getLong("id"), rs.getLong("item_id"), rs.getString("movement_type"),
                        rs.getBigDecimal("quantity_delta"), rs.getBigDecimal("resulting_quantity"), rs.getString("reason"),
                        rs.getTimestamp("occurred_at").toInstant())), businessId, itemId, itemId, MAX_MOVEMENT_ROWS + 1);
        enforceLimit(rows.size() - 1L, MAX_MOVEMENT_ROWS);
        return csv(rows);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public byte[] datasetRows(VerifiedFirebaseIdentity identity, long businessId, long datasetId) {
        authorize(identity, businessId);
        List<Dataset> datasets = jdbc.query("select columns_json,row_count from dataset where business_id=? and id=?",
                (rs, row) -> new Dataset(rs.getString("columns_json"), rs.getInt("row_count")), businessId, datasetId);
        Dataset dataset = datasets.stream().findFirst().orElseThrow(() -> new BusinessNotFoundException("Dataset not found"));
        long actualRowCount = jdbc.queryForObject("select count(*) from dataset_row where dataset_id=?", Long.class, datasetId);
        enforceLimit(actualRowCount, MAX_DATASET_ROWS);
        if (actualRowCount != dataset.rowCount) throw new com.sohosuite.backend.exception.BusinessConflictException(
                "Dataset row metadata does not match stored rows");
        List<String> header;
        try {
            header = json.readValue(dataset.columnsJson, COLUMNS).stream()
                    .map(column -> String.valueOf(column.getOrDefault("name", ""))).toList();
        } catch (IOException | RuntimeException invalidSchema) {
            throw new IllegalStateException("Dataset column metadata is unavailable");
        }
        List<List<?>> rows = new ArrayList<>();
        rows.add(header);
        jdbc.query("select values_json from dataset_row where dataset_id=? order by row_number limit ?", rs -> {
            try { rows.add(json.readValue(rs.getString("values_json"), VALUES)); }
            catch (IOException invalidRow) { throw new IllegalStateException("Dataset rows are unavailable"); }
        }, datasetId, MAX_DATASET_ROWS + 1);
        enforceLimit(rows.size() - 1L, MAX_DATASET_ROWS);
        if (rows.size() - 1L != actualRowCount) {
            throw new com.sohosuite.backend.exception.BusinessConflictException("Dataset rows changed during export");
        }
        return csv(rows);
    }

    private void authorize(VerifiedFirebaseIdentity identity, long businessId) {
        if (identity == null || identity.uid() == null
                || memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId).isEmpty()) {
            throw new BusinessAccessDeniedException();
        }
    }

    private static void addMetric(List<List<?>> rows, String name, com.sohosuite.backend.analytics.dto.MetricResult<?> metric) {
        rows.add(List.of(name, metric.status(), metric.value() == null ? "" : metric.value(),
                metric.reason() == null ? "" : metric.reason()));
    }

    static byte[] csv(List<List<?>> rows) {
        StringBuilder out = new StringBuilder("\uFEFF");
        for (List<?> row : rows) {
            for (int i = 0; i < row.size(); i++) {
                if (i > 0) out.append(',');
                String value = row.get(i) == null ? "" : row.get(i).toString();
                if (isFormulaCell(value)) value = "'" + value;
                out.append('"').append(value.replace("\"", "\"\"")).append('"');
            }
            out.append("\r\n");
        }
        return out.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private static boolean isFormulaCell(String value) {
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            if (Character.isWhitespace(c) || Character.isISOControl(c)) continue;
            return c == '=' || c == '+' || c == '-' || c == '@';
        }
        return false;
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && (from.isAfter(to) || from.plusDays(366).isBefore(to))) {
            throw new IllegalArgumentException("Date range must be ordered and no longer than 367 days");
        }
    }
    private static void enforceLimit(long count, int max) { if (count > max) throw new ExportTooLargeException(); }
    private static String nullSafe(String value) { return value == null ? "" : value; }
    private record Dataset(String columnsJson, int rowCount) { }
}
