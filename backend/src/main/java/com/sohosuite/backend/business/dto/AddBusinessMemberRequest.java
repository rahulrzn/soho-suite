package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.BusinessRole;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AddBusinessMemberRequest(@NotNull @Positive Long userId, @NotNull BusinessRole role) {}
