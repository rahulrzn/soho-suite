package com.sohosuite.backend.expense.service;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.expense.dto.*;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.BusinessNotFoundException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {
    private static final int MAX_PAGE_SIZE = 100;
    private final JdbcTemplate jdbc;
    private final BusinessMembershipRepository memberships;
    private final BusinessActivityService activity;
    public ExpenseService(JdbcTemplate jdbc, BusinessMembershipRepository memberships, BusinessActivityService activity) {
        this.jdbc = jdbc; this.memberships = memberships; this.activity = activity;
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ExpenseResponse create(VerifiedFirebaseIdentity identity, long businessId, ExpenseRequest request) {
        BusinessMembership actor = member(identity, businessId); writer(actor); validate(request);
        return jdbc.queryForObject("insert into business_expense (business_id,created_by,expense_date,amount,currency,category,description,reference) values (?,?,?,?,?,?,?,?) returning " + COLUMNS,
                ExpenseService::map, businessId, actor.getUser().getId(), request.expenseDate(), request.amount(), actor.getBusiness().getBusinessCurrency(), request.category().name(), clean(request.description()), clean(request.reference()));
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ExpenseResponse createLogged(VerifiedFirebaseIdentity identity, long businessId, ExpenseRequest request) {
        ExpenseResponse response = create(identity, businessId, request);
        BusinessMembership actor = member(identity, businessId);
        activity.record(businessId, actor.getUser().getId(), "EXPENSE_CREATED", "EXPENSE", Long.toString(response.id()), "Expense recorded");
        return response;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ExpensePageResponse list(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to,
            ExpenseCategory category, int page, int size) {
        member(identity, businessId); validatePageAndRange(from, to, page, size);
        String filters = " from business_expense where business_id=? and (?::date is null or expense_date>=?) and (?::date is null or expense_date<=?) and (?::varchar is null or category=?)";
        long total = jdbc.queryForObject("select count(*)" + filters, Long.class, businessId, from, from, to, to,
                category == null ? null : category.name(), category == null ? null : category.name());
        List<ExpenseResponse> items = jdbc.query("select " + COLUMNS + filters + " order by expense_date desc,id desc limit ? offset ?",
                ExpenseService::map, businessId, from, from, to, to, category == null ? null : category.name(),
                category == null ? null : category.name(), size, (long) page * size);
        return new ExpensePageResponse(items, total, page, size);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ExpenseSummaryResponse summary(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        member(identity, businessId); validatePageAndRange(from, to, 0, 1);
        List<Map<String,Object>> rows = jdbc.queryForList("select currency,category,sum(amount) total from business_expense where business_id=? and (?::date is null or expense_date>=?) and (?::date is null or expense_date<=?) group by currency,category order by currency,category",
                businessId, from, from, to, to);
        Map<String,List<ExpenseSummaryResponse.CategoryTotal>> groups = new LinkedHashMap<>();
        Map<String,BigDecimal> totals = new LinkedHashMap<>();
        for (Map<String,Object> row : rows) {
            String currency = (String) row.get("currency");
            ExpenseCategory category = ExpenseCategory.valueOf((String) row.get("category"));
            BigDecimal amount = (BigDecimal) row.get("total");
            groups.computeIfAbsent(currency, ignored -> new ArrayList<>()).add(new ExpenseSummaryResponse.CategoryTotal(category, amount));
            totals.merge(currency, amount, BigDecimal::add);
        }
        List<ExpenseSummaryResponse.CurrencySummary> currencies = totals.entrySet().stream()
                .map(entry -> new ExpenseSummaryResponse.CurrencySummary(entry.getKey(), entry.getValue(), groups.get(entry.getKey()))).toList();
        return new ExpenseSummaryResponse(currencies);
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public ExpenseResponse update(VerifiedFirebaseIdentity identity, long businessId, long expenseId, ExpenseRequest request) {
        BusinessMembership actor = member(identity, businessId); writer(actor); validate(request);
        List<ExpenseResponse> updated = jdbc.query("update business_expense set expense_date=?,amount=?,category=?,description=?,reference=?,updated_at=CURRENT_TIMESTAMP where business_id=? and id=? returning " + COLUMNS,
                ExpenseService::map, request.expenseDate(), request.amount(), request.category().name(), clean(request.description()), clean(request.reference()), businessId, expenseId);
        ExpenseResponse response = updated.stream().findFirst().orElseThrow(() -> new BusinessNotFoundException("Expense not found"));
        activity.record(businessId, actor.getUser().getId(), "EXPENSE_UPDATED", "EXPENSE", Long.toString(expenseId), "Expense updated");
        return response;
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void delete(VerifiedFirebaseIdentity identity, long businessId, long expenseId) {
        BusinessMembership actor = member(identity, businessId); writer(actor);
        int deleted = jdbc.update("delete from business_expense where business_id=? and id=?", businessId, expenseId);
        if (deleted == 0) throw new BusinessNotFoundException("Expense not found");
        activity.record(businessId, actor.getUser().getId(), "EXPENSE_DELETED", "EXPENSE", Long.toString(expenseId), "Expense deleted");
    }

    private BusinessMembership member(VerifiedFirebaseIdentity identity, long businessId) {
        if (identity == null || identity.uid() == null) throw new BusinessAccessDeniedException();
        return memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId).orElseThrow(BusinessAccessDeniedException::new);
    }
    private static void writer(BusinessMembership actor) {
        if (actor.getRole() == BusinessRole.VIEWER) throw new BusinessAccessDeniedException();
    }
    private static void validate(ExpenseRequest request) {
        if (request == null || request.expenseDate() == null || request.amount() == null || request.category() == null
                || request.description() == null || request.description().isBlank() || request.description().trim().length() > 240
                || request.reference() != null && request.reference().length() > 100) {
            throw new IllegalArgumentException("Expense details are invalid");
        }
        if (request.amount().signum() <= 0) throw new IllegalArgumentException("Expense amount must be positive");
        if (request.amount().scale() > 4 || request.amount().precision() - request.amount().scale() > 15)
            throw new IllegalArgumentException("Amount supports up to 15 integer digits and 4 decimal places");
        if (request.expenseDate().isAfter(LocalDate.now().plusDays(1))) throw new IllegalArgumentException("Expense date cannot be in the future");
    }
    private static void validatePageAndRange(LocalDate from, LocalDate to, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100");
        if (from != null && to != null && (from.isAfter(to) || from.plusDays(366).isBefore(to))) throw new IllegalArgumentException("Date range must be ordered and no longer than 367 days");
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static final String COLUMNS = "id,expense_date,amount,currency,category,description,reference,created_by,created_at,updated_at";
    private static ExpenseResponse map(ResultSet rs, int row) throws SQLException {
        return new ExpenseResponse(rs.getLong("id"), rs.getDate("expense_date").toLocalDate(), rs.getBigDecimal("amount"),
                rs.getString("currency"), ExpenseCategory.valueOf(rs.getString("category")), rs.getString("description"),
                rs.getString("reference"), rs.getObject("created_by", Long.class), rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
}
