package com.sohosuite.backend.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseRequest(@NotNull LocalDate expenseDate, @NotNull @DecimalMin(value = "0.0001") BigDecimal amount,
        @NotNull ExpenseCategory category, @NotBlank @Size(max = 240) String description,
        @Size(max = 100) String reference) { }
