package com.sohosuite.backend.report;

import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/businesses/{businessId}/exports")
public class ReportExportController {
    private static final MediaType CSV = MediaType.parseMediaType("text/csv;charset=UTF-8");
    private final ReportExportService service;

    public ReportExportController(ReportExportService service) { this.service = service; }

    @GetMapping(value = "/analytics", produces = "text/csv")
    public ResponseEntity<byte[]> analytics(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam LocalDate from, @RequestParam LocalDate to) {
        return csv(service.analytics(identity, businessId, from, to), "analytics.csv");
    }

    @GetMapping(value = "/expenses", produces = "text/csv")
    public ResponseEntity<byte[]> expenses(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return csv(service.expenses(identity, businessId, from, to), "expenses.csv");
    }

    @GetMapping(value = "/expenses/summary", produces = "text/csv")
    public ResponseEntity<byte[]> expenseSummary(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        return csv(service.expenseSummary(identity, businessId, from, to), "expense-summary.csv");
    }

    @GetMapping(value = "/inventory", produces = "text/csv")
    public ResponseEntity<byte[]> inventory(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId) {
        return csv(service.inventory(identity, businessId), "inventory.csv");
    }

    @GetMapping(value = "/inventory/movements", produces = "text/csv")
    public ResponseEntity<byte[]> inventoryMovements(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @RequestParam(required = false) Long itemId) {
        return csv(service.inventoryMovements(identity, businessId, itemId), "inventory-movements.csv");
    }

    @GetMapping(value = "/datasets/{datasetId}/rows", produces = "text/csv")
    public ResponseEntity<byte[]> datasetRows(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long datasetId) {
        return csv(service.datasetRows(identity, businessId, datasetId), "dataset-" + datasetId + "-rows.csv");
    }

    private ResponseEntity<byte[]> csv(byte[] body, String filename) {
        return ResponseEntity.ok().contentType(CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(body);
    }
}
