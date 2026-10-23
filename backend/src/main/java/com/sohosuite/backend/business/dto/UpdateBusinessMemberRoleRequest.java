package com.sohosuite.backend.business.dto;

import com.sohosuite.backend.business.enums.BusinessRole;
import jakarta.validation.constraints.NotNull;

public record UpdateBusinessMemberRoleRequest(@NotNull BusinessRole role) {}
