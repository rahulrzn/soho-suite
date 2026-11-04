package com.sohosuite.backend.analytics.service;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.analytics.dto.BusinessHealthInputRequest;
import com.sohosuite.backend.analytics.dto.BusinessHealthInputResponse;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessHealthInputService {
    private static final String COLUMNS = "period_from,period_to,currency,cash_balance,inventory_value,cost_of_goods_sold,updated_at";
    private final JdbcTemplate jdbc;
    private final BusinessMembershipRepository memberships;
    private final BusinessActivityService activity;

    public BusinessHealthInputService(JdbcTemplate jdbc, BusinessMembershipRepository memberships, BusinessActivityService activity) {
        this.jdbc = jdbc;
        this.memberships = memberships;
        this.activity = activity;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessHealthInputResponse get(VerifiedFirebaseIdentity identity, long businessId, LocalDate from, LocalDate to) {
        BusinessMembership actor = member(identity, businessId);
        validateRange(from, to);
        List<BusinessHealthInputResponse> matches = jdbc.query(
                "select " + COLUMNS + " from business_health_input where business_id=? and period_from=? and period_to=?",
                BusinessHealthInputService::map, businessId, from, to);
        return matches.stream().findFirst().orElseGet(() -> new BusinessHealthInputResponse(false, from, to,
                actor.getBusiness().getBusinessCurrency(), null, null, null, null));
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public BusinessHealthInputResponse save(VerifiedFirebaseIdentity identity, long businessId, BusinessHealthInputRequest request) {
        if (request == null) throw new IllegalArgumentException("Health inputs are required");
        validateRange(request.from(), request.to());
        requireAmount(request.cashBalance(), "Cash balance");
        requireAmount(request.inventoryValue(), "Inventory value");
        requireAmount(request.costOfGoodsSold(), "Cost of goods sold");
        BusinessMembership actor = member(identity, businessId);
        if (actor.getRole() == BusinessRole.VIEWER) throw new BusinessAccessDeniedException();

        String currency = actor.getBusiness().getBusinessCurrency();
        List<BusinessHealthInputResponse> saved = jdbc.query(
                "insert into business_health_input (business_id,period_from,period_to,currency,cash_balance,inventory_value,cost_of_goods_sold,updated_by) "
                        + "values (?,?,?,?,?,?,?,?) on conflict (business_id,period_from,period_to) do update set currency=excluded.currency,"
                        + "cash_balance=excluded.cash_balance,inventory_value=excluded.inventory_value,cost_of_goods_sold=excluded.cost_of_goods_sold,"
                        + "updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP returning " + COLUMNS,
                BusinessHealthInputService::map, businessId, request.from(), request.to(), currency, request.cashBalance(),
                request.inventoryValue(), request.costOfGoodsSold(), actor.getUser().getId());
        BusinessHealthInputResponse result = saved.getFirst();
        activity.record(businessId, actor.getUser().getId(), "HEALTH_INPUTS_UPDATED", "BUSINESS_HEALTH",
                request.from() + "/" + request.to(), "Business health inputs updated");
        return result;
    }

    private BusinessMembership member(VerifiedFirebaseIdentity identity, long businessId) {
        if (identity == null || identity.uid() == null) throw new BusinessAccessDeniedException();
        return memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId).orElseThrow(BusinessAccessDeniedException::new);
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to) || from.plusDays(365).isBefore(to)) {
            throw new IllegalArgumentException("Health input dates must be ordered and no more than 366 days apart");
        }
    }

    private static void requireAmount(java.math.BigDecimal value, String label) {
        if (value == null || value.signum() < 0 || value.scale() > 4 || value.precision() - value.scale() > 15) {
            throw new IllegalArgumentException(label + " must be non-negative with at most 15 integer digits and 4 decimal places");
        }
    }

    private static BusinessHealthInputResponse map(ResultSet rs, int row) throws SQLException {
        return new BusinessHealthInputResponse(true, rs.getDate("period_from").toLocalDate(), rs.getDate("period_to").toLocalDate(),
                rs.getString("currency"), rs.getBigDecimal("cash_balance"), rs.getBigDecimal("inventory_value"),
                rs.getBigDecimal("cost_of_goods_sold"), rs.getTimestamp("updated_at").toInstant());
    }
}
