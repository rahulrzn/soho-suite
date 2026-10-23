package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.LocationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record BusinessLocationRequest(
        Long id,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,40}") String locationCode,
        @Size(max = 120) String locationName,
        @NotNull LocationType locationType,
        @Size(max = 255) String addressLine1,
        @Size(max = 255) String addressLine2,
        @Size(max = 120) String city,
        @Size(max = 120) String state,
        @Size(max = 40) String postalCode,
        @Size(max = 120) String country,
        Boolean isRegisteredAddress,
        Boolean isActive) {}
