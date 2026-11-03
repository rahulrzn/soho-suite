package com.sohosuite.backend.collaboration.dto;

import com.sohosuite.backend.business.enums.BusinessRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;

public record CreateInvitationRequest(@Email @NotNull String email, @NotNull BusinessRole role) { }
