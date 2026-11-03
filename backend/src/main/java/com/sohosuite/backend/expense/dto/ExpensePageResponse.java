package com.sohosuite.backend.expense.dto;
import java.util.List;
public record ExpensePageResponse(List<ExpenseResponse> items, long total, int page, int size) { }
