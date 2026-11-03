package com.sohosuite.backend.inventory.dto;
import java.util.List;
public record InventoryItemPageResponse(List<InventoryItemResponse> items, long total, int page, int size) { }
