package com.sohosuite.backend.analytics.dto;

import java.time.LocalDate;
import java.util.List;

public record BusinessHealthScoreResponse(String status, Integer score, String currency,
        LocalDate from, LocalDate to, List<HealthScoreComponent> components,
        String interpretation, String limitations) { }
