package com.sohosuite.backend.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateInventoryItemRequest(
        @NotBlank @Size(max = 120) String name,
        @Size(max = 80) String sku,
        @Size(max = 500) String description,
        @NotNull Boolean active) { }
