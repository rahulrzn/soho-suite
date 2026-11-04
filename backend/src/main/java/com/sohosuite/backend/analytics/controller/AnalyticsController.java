package com.sohosuite.backend.analytics.controller;

import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigRequest;
import com.sohosuite.backend.analytics.dto.AnalyticsDatasetConfigResponse;
import com.sohosuite.backend.analytics.dto.AnalyticsOverviewResponse;
import com.sohosuite.backend.analytics.dto.BusinessHealthScoreResponse;
import com.sohosuite.backend.analytics.service.BusinessHealthScoreService;
import com.sohosuite.backend.analytics.service.AnalyticsService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/businesses/{businessId}/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final BusinessHealthScoreService healthScoreService;

    @Autowired
    public AnalyticsController(AnalyticsService analyticsService, BusinessHealthScoreService healthScoreService) {
        this.analyticsService = analyticsService;
        this.healthScoreService = healthScoreService;
    }

    @PutMapping(value = "/dataset-config", consumes = MediaType.APPLICATION_JSON_VALUE)
    public AnalyticsDatasetConfigResponse configureDataset(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable Long businessId,
            @Valid @RequestBody AnalyticsDatasetConfigRequest request) {
        return analyticsService.configure(identity, businessId, request);
    }

    @GetMapping("/overview")
    public AnalyticsOverviewResponse overview(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable Long businessId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return analyticsService.overview(identity, businessId, from, to);
    }

    @GetMapping("/health-score")
    public BusinessHealthScoreResponse healthScore(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable Long businessId,
            @RequestParam LocalDate from,
            @RequestParam LocalDate to) {
        return healthScoreService.score(identity, businessId, from, to);
    }
}
