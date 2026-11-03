package com.sohosuite.backend.inventory.dto;
import java.util.List;
public record InventoryMovementPageResponse(List<InventoryMovementResponse> items, long total, int page, int size) { }
