package com.sohosuite.backend.inventory.dto;
import java.math.BigDecimal;
import java.time.Instant;
public record InventoryItemResponse(long id, String name, String sku, String description, boolean active,
        BigDecimal quantity, Instant createdAt, Instant updatedAt) { }
