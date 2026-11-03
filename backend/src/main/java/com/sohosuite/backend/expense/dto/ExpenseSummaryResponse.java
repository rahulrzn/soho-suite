package com.sohosuite.backend.expense.dto;

import java.math.BigDecimal;
import java.util.List;

public record ExpenseSummaryResponse(List<CurrencySummary> currencies) {
    public record CurrencySummary(String currency, BigDecimal total, List<CategoryTotal> categories) { }
    public record CategoryTotal(ExpenseCategory category, BigDecimal total) { }
}
