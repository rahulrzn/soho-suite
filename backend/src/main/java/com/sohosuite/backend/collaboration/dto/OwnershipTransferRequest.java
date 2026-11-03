package com.sohosuite.backend.collaboration.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OwnershipTransferRequest(@NotNull @Positive Long newOwnerUserId) { }
