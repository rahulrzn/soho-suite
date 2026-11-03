package com.sohosuite.backend.analytics.dto;

public record HealthScoreComponent(String name, int weightPercent, MetricStatus inputStatus,
        Integer score, String formula, String reason) { }
