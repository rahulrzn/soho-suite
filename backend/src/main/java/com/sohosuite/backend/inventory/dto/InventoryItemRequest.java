package com.sohosuite.backend.inventory.dto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
public record InventoryItemRequest(@NotBlank @Size(max=120) String name, @Size(max=80) String sku,
        @Size(max=500) String description, @DecimalMin("0.0000") BigDecimal openingQuantity) { }
