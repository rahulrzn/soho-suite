package com.sohosuite.backend.activity.controller;

import com.sohosuite.backend.activity.dto.ActivityPageResponse;
import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/businesses/{businessId}/activity")
public class BusinessActivityController {
    private final BusinessActivityService service;
    public BusinessActivityController(BusinessActivityService service) { this.service = service; }

    @GetMapping
    public ActivityPageResponse list(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam(defaultValue = "0") @Min(0) @Max(1_000_000) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(identity, businessId, page, size);
    }
}
