package com.sohosuite.backend.inventory.dto;
import java.math.BigDecimal;
import java.time.Instant;
public record InventoryMovementResponse(long id, long itemId, InventoryMovementType type, BigDecimal quantityDelta,
        BigDecimal resultingQuantity, String reason, Long actorUserId, Instant occurredAt) { }
