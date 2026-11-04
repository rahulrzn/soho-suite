package com.sohosuite.backend.analytics.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record BusinessHealthInputResponse(boolean saved, LocalDate from, LocalDate to, String currency,
        BigDecimal cashBalance, BigDecimal inventoryValue, BigDecimal costOfGoodsSold, Instant updatedAt) { }
