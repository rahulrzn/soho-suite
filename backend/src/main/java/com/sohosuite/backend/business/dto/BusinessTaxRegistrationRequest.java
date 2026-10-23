package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.TaxRegistrationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BusinessTaxRegistrationRequest(
        Long id,
        @NotBlank @Pattern(regexp = "[A-Z][A-Z0-9_]{1,39}") String registrationType,
        @NotBlank @Size(max = 100) String registrationNumber,
        @NotBlank @Size(max = 120) String jurisdiction,
        TaxRegistrationStatus status) {}
