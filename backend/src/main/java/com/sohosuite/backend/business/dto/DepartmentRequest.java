package com.sohosuite.backend.business.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record DepartmentRequest(
        Long id,
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{1,40}") String departmentCode,
        @NotBlank @Size(max = 120) String departmentName,
        Boolean isActive) {}
