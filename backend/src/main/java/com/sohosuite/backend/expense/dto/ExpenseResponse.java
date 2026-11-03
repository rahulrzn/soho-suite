package com.sohosuite.backend.expense.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record ExpenseResponse(long id, LocalDate expenseDate, BigDecimal amount, String currency,
        ExpenseCategory category, String description, String reference, Long createdBy, Instant createdAt, Instant updatedAt) { }
