package com.sohosuite.backend.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AnalyticsDatasetConfigRequest(
        @NotNull @Positive Long datasetId,
        @NotBlank @Size(max = 120) String dateColumn,
        @NotBlank @Size(max = 120) String lineAmountColumn,
        @NotBlank @Size(max = 120) String orderIdColumn,
        @Size(max = 120) String customerIdColumn,
        @NotBlank @Pattern(regexp = "[A-Z]{3}") String confirmedCurrency) {}
