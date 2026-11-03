package com.sohosuite.backend.inventory.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
public record InventoryMovementRequest(@NotNull InventoryMovementType type, @NotNull BigDecimal quantity,
        @NotBlank @Size(max=240) String reason) { }
