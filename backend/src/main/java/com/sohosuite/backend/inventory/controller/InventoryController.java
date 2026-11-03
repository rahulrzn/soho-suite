package com.sohosuite.backend.inventory.controller;

import com.sohosuite.backend.inventory.dto.*;
import com.sohosuite.backend.inventory.service.InventoryService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Validated
@RestController
@RequestMapping("/api/businesses/{businessId}/inventory/items")
public class InventoryController {
    private final InventoryService service;

    public InventoryController(InventoryService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryItemResponse create(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @Valid @RequestBody InventoryItemRequest request) {
        return service.create(identity, businessId, request);
    }

    @GetMapping
    public InventoryItemPageResponse list(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) Boolean active) {
        return service.list(identity, businessId, page, size, active);
    }

    @GetMapping("/{itemId}")
    public InventoryItemResponse get(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long itemId) {
        return service.get(identity, businessId, itemId);
    }

    @PatchMapping("/{itemId}")
    public InventoryItemResponse update(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long itemId,
            @Valid @RequestBody UpdateInventoryItemRequest request) {
        return service.update(identity, businessId, itemId, request);
    }

    @PostMapping("/{itemId}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public InventoryMovementResponse move(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long itemId,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody InventoryMovementRequest request) {
        return service.move(identity, businessId, itemId, request, idempotencyKey);
    }

    @GetMapping("/{itemId}/movements")
    public InventoryMovementPageResponse history(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long itemId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.history(identity, businessId, itemId, page, size);
    }
}
