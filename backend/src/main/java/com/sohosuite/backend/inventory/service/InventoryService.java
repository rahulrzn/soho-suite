package com.sohosuite.backend.inventory.service;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.BusinessConflictException;
import com.sohosuite.backend.exception.BusinessNotFoundException;
import com.sohosuite.backend.inventory.dto.*;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HexFormat;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private static final int MAX_PAGE_SIZE = 100;
    private final JdbcTemplate jdbc;
    private final BusinessMembershipRepository memberships;
    private final BusinessActivityService activity;
    public InventoryService(JdbcTemplate jdbc, BusinessMembershipRepository memberships, BusinessActivityService activity) {
        this.jdbc = jdbc; this.memberships = memberships; this.activity = activity;
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryItemResponse create(VerifiedFirebaseIdentity identity, long businessId, InventoryItemRequest request) {
        BusinessMembership actor = writer(identity, businessId);
        if (request == null || request.name() == null || request.name().isBlank() || request.name().trim().length() > 120
                || request.sku() != null && request.sku().trim().length() > 80
                || request.description() != null && request.description().length() > 500) {
            throw new IllegalArgumentException("Inventory item details are invalid");
        }
        BigDecimal opening = request.openingQuantity() == null ? BigDecimal.ZERO : request.openingQuantity();
        validateQuantity(opening);
        if (opening.signum() < 0) throw new IllegalArgumentException("Opening stock cannot be negative");
        InventoryItemResponse item;
        try {
            item = jdbc.queryForObject("insert into inventory_item (business_id,name,sku,description,quantity) values (?,?,?,?,?) returning " + ITEM_COLUMNS,
                    InventoryService::mapItem, businessId, clean(request.name()), clean(request.sku()), clean(request.description()), opening);
        } catch (org.springframework.dao.DataIntegrityViolationException duplicateSku) {
            throw new BusinessConflictException("SKU already exists for this business");
        }
        if (opening.signum() > 0) {
            jdbc.update("insert into inventory_movement (business_id,item_id,actor_user_id,movement_type,quantity_delta,resulting_quantity,reason) values (?,?,?,'OPENING_STOCK',?,?,'Opening stock')",
                    businessId, item.id(), actor.getUser().getId(), opening, opening);
            activity.record(businessId, actor.getUser().getId(), "INVENTORY_OPENING_STOCK", "INVENTORY_ITEM", Long.toString(item.id()), "Opening stock recorded");
        }
        activity.record(businessId, actor.getUser().getId(), "INVENTORY_ITEM_CREATED", "INVENTORY_ITEM", Long.toString(item.id()), "Inventory item created");
        return item;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryItemPageResponse list(VerifiedFirebaseIdentity identity, long businessId, int page, int size, Boolean active) {
        member(identity, businessId); checkPage(page, size);
        String filter = " from inventory_item where business_id=? and (?::boolean is null or active=?)";
        long total = jdbc.queryForObject("select count(*)" + filter, Long.class, businessId, active, active);
        List<InventoryItemResponse> items = jdbc.query("select " + ITEM_COLUMNS + filter + " order by id limit ? offset ?",
                InventoryService::mapItem, businessId, active, active, size, (long) page * size);
        return new InventoryItemPageResponse(items, total, page, size);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryItemResponse get(VerifiedFirebaseIdentity identity, long businessId, long itemId) {
        member(identity, businessId);
        return jdbc.query("select " + ITEM_COLUMNS + " from inventory_item where business_id=? and id=?",
                InventoryService::mapItem, businessId, itemId).stream().findFirst()
                .orElseThrow(() -> new BusinessNotFoundException("Inventory item not found"));
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryItemResponse update(VerifiedFirebaseIdentity identity, long businessId, long itemId,
            UpdateInventoryItemRequest request) {
        BusinessMembership actor = writer(identity, businessId);
        if (request == null || request.active() == null || request.name() == null || request.name().isBlank()
                || request.name().trim().length() > 120 || request.sku() != null && request.sku().trim().length() > 80
                || request.description() != null && request.description().length() > 500) {
            throw new IllegalArgumentException("Inventory item details are invalid");
        }
        try {
            InventoryItemResponse item = jdbc.query("update inventory_item set name=?,sku=?,description=?,active=?,updated_at=CURRENT_TIMESTAMP where business_id=? and id=? returning " + ITEM_COLUMNS,
                    InventoryService::mapItem, clean(request.name()), clean(request.sku()), clean(request.description()),
                    request.active(), businessId, itemId).stream().findFirst()
                    .orElseThrow(() -> new BusinessNotFoundException("Inventory item not found"));
            activity.record(businessId, actor.getUser().getId(), "INVENTORY_ITEM_UPDATED", "INVENTORY_ITEM",
                    Long.toString(itemId), "Inventory item details updated");
            return item;
        } catch (org.springframework.dao.DataIntegrityViolationException duplicateSku) {
            throw new BusinessConflictException("SKU already exists for this business");
        }
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryMovementResponse move(VerifiedFirebaseIdentity identity, long businessId, long itemId,
            InventoryMovementRequest request, String idempotencyKey) {
        BusinessMembership actor = writer(identity, businessId);
        if (request == null || request.type() == null) throw new IllegalArgumentException("A stock movement type is required");
        if (request.reason() == null || request.reason().isBlank() || request.reason().trim().length() > 240) {
            throw new IllegalArgumentException("A movement reason of 1 to 240 characters is required");
        }
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 80) throw new IllegalArgumentException("A valid Idempotency-Key header is required");
        validateQuantity(request.quantity());
        String fingerprint = fingerprint(itemId, request);
        InventoryMovementResponse prior = existing(businessId, idempotencyKey, fingerprint);
        if (prior != null) return prior;
        InventoryItemResponse locked = jdbc.query("select " + ITEM_COLUMNS + " from inventory_item where business_id=? and id=? for update",
                InventoryService::mapItem, businessId, itemId).stream().findFirst().orElseThrow(BusinessAccessDeniedException::new);
        prior = existing(businessId, idempotencyKey, fingerprint);
        if (prior != null) return prior;
        BigDecimal delta = switch (request.type()) {
            case RECEIPT -> positive(request.quantity());
            case DAMAGE -> positive(request.quantity()).negate();
            case ADJUSTMENT -> nonZero(request.quantity());
            case COUNT_CORRECTION -> {
                if (request.quantity().signum() < 0) throw new IllegalArgumentException("Counted stock cannot be negative");
                yield request.quantity().subtract(locked.quantity());
            }
            case OPENING_STOCK -> throw new IllegalArgumentException("Opening stock is set when an item is created");
        };
        if (delta.signum() == 0) throw new IllegalArgumentException("Stock operation would not change the balance");
        BigDecimal resulting = locked.quantity().add(delta);
        if (resulting.signum() < 0) throw new BusinessConflictException("Stock cannot be reduced below zero");
        int changed = jdbc.update("update inventory_item set quantity=?,version=version+1,updated_at=CURRENT_TIMESTAMP where business_id=? and id=?",
                resulting, businessId, itemId);
        if (changed != 1) throw new BusinessConflictException("Inventory item changed; retry the operation");
        Long movementId = jdbc.queryForObject("insert into inventory_movement (business_id,item_id,actor_user_id,movement_type,quantity_delta,resulting_quantity,reason,idempotency_key,request_fingerprint) values (?,?,?,?,?,?,?,?,?) returning id",
                Long.class, businessId, itemId, actor.getUser().getId(), request.type().name(), delta, resulting, clean(request.reason()), idempotencyKey, fingerprint);
        activity.record(businessId, actor.getUser().getId(), "INVENTORY_MOVEMENT_RECORDED", "INVENTORY_ITEM", Long.toString(itemId), "Stock movement recorded: " + request.type().name());
        return new InventoryMovementResponse(movementId, itemId, request.type(), delta, resulting, clean(request.reason()), actor.getUser().getId(), java.time.Instant.now());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InventoryMovementPageResponse history(VerifiedFirebaseIdentity identity, long businessId, long itemId, int page, int size) {
        member(identity, businessId); checkPage(page, size);
        if (jdbc.queryForList("select id from inventory_item where business_id=? and id=?", businessId, itemId).isEmpty()) throw new BusinessAccessDeniedException();
        long total = jdbc.queryForObject("select count(*) from inventory_movement where business_id=? and item_id=?", Long.class, businessId, itemId);
        List<InventoryMovementResponse> rows = jdbc.query("select id,item_id,movement_type,quantity_delta,resulting_quantity,reason,actor_user_id,occurred_at from inventory_movement where business_id=? and item_id=? order by occurred_at desc,id desc limit ? offset ?",
                InventoryService::mapMovement, businessId, itemId, size, (long) page * size);
        return new InventoryMovementPageResponse(rows, total, page, size);
    }

    private InventoryMovementResponse existing(long businessId, String key, String fingerprint) {
        List<Existing> matches = jdbc.query("select id,item_id,movement_type,quantity_delta,resulting_quantity,reason,actor_user_id,occurred_at,request_fingerprint from inventory_movement where business_id=? and idempotency_key=?",
                (rs,n) -> new Existing(mapMovement(rs,n), rs.getString("request_fingerprint")), businessId, key);
        if (matches.isEmpty()) return null;
        Existing prior = matches.getFirst();
        if (!fingerprint.equals(prior.fingerprint)) throw new BusinessConflictException("Idempotency key was used for a different stock operation");
        return prior.response;
    }
    private BusinessMembership member(VerifiedFirebaseIdentity identity, long businessId) {
        if (identity == null || identity.uid() == null) throw new BusinessAccessDeniedException();
        return memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId).orElseThrow(BusinessAccessDeniedException::new);
    }
    private BusinessMembership writer(VerifiedFirebaseIdentity identity, long businessId) {
        BusinessMembership membership = member(identity, businessId);
        if (membership.getRole() == BusinessRole.VIEWER) throw new BusinessAccessDeniedException();
        return membership;
    }
    private static void checkPage(int page, int size) { if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100"); }
    private static BigDecimal positive(BigDecimal value) { if (value.signum() <= 0) throw new IllegalArgumentException("Quantity must be positive"); return value; }
    private static BigDecimal nonZero(BigDecimal value) { if (value.signum() == 0) throw new IllegalArgumentException("Adjustment quantity cannot be zero"); return value; }
    private static void validateQuantity(BigDecimal value) {
        if (value == null || value.scale() > 4 || value.precision() - value.scale() > 15) throw new IllegalArgumentException("Quantity supports up to 15 integer digits and 4 decimal places");
    }
    private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String fingerprint(long itemId, InventoryMovementRequest request) {
        try { String value = itemId + "|" + request.type() + "|" + request.quantity().stripTrailingZeros().toPlainString() + "|" + clean(request.reason());
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private static final String ITEM_COLUMNS = "id,name,sku,description,active,quantity,created_at,updated_at";
    private static InventoryItemResponse mapItem(ResultSet rs, int row) throws SQLException {
        return new InventoryItemResponse(rs.getLong("id"), rs.getString("name"), rs.getString("sku"), rs.getString("description"),
                rs.getBoolean("active"), rs.getBigDecimal("quantity"), rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("updated_at").toInstant());
    }
    private static InventoryMovementResponse mapMovement(ResultSet rs, int row) throws SQLException {
        return new InventoryMovementResponse(rs.getLong("id"), rs.getLong("item_id"), InventoryMovementType.valueOf(rs.getString("movement_type")),
                rs.getBigDecimal("quantity_delta"), rs.getBigDecimal("resulting_quantity"), rs.getString("reason"), rs.getObject("actor_user_id", Long.class), rs.getTimestamp("occurred_at").toInstant());
    }
    private record Existing(InventoryMovementResponse response, String fingerprint) { }
}
