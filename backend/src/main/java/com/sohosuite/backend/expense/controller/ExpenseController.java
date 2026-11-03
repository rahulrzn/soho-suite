package com.sohosuite.backend.expense.controller;

import com.sohosuite.backend.expense.dto.*;
import com.sohosuite.backend.expense.service.ExpenseService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/businesses/{businessId}/expenses")
public class ExpenseController {
    private final ExpenseService service;
    public ExpenseController(ExpenseService service) { this.service = service; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @Valid @RequestBody ExpenseRequest request) {
        return service.createLogged(identity, businessId, request);
    }
    @GetMapping
    public ExpensePageResponse list(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @PathVariable long businessId,
            @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) ExpenseCategory category, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return service.list(identity, businessId, from, to, category, page, size);
    }
    @GetMapping("/summary")
    public ExpenseSummaryResponse summary(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @PathVariable long businessId,
            @RequestParam(required = false) LocalDate from, @RequestParam(required = false) LocalDate to) {
        return service.summary(identity, businessId, from, to);
    }
    @PutMapping("/{expenseId}")
    public ExpenseResponse update(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @PathVariable long businessId,
            @PathVariable long expenseId, @Valid @RequestBody ExpenseRequest request) {
        return service.update(identity, businessId, expenseId, request);
    }
    @DeleteMapping("/{expenseId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @PathVariable long businessId, @PathVariable long expenseId) {
        service.delete(identity, businessId, expenseId);
    }
}
