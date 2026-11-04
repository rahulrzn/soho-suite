package com.sohosuite.backend.analytics.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record BusinessHealthInputRequest(
        @NotNull LocalDate from,
        @NotNull LocalDate to,
        @NotNull @DecimalMin(value = "0.0") @Digits(integer = 15, fraction = 4) BigDecimal cashBalance,
        @NotNull @DecimalMin(value = "0.0") @Digits(integer = 15, fraction = 4) BigDecimal inventoryValue,
        @NotNull @DecimalMin(value = "0.0") @Digits(integer = 15, fraction = 4) BigDecimal costOfGoodsSold) { }
