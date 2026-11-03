package com.sohosuite.backend.collaboration.controller;

import com.sohosuite.backend.collaboration.dto.OwnershipTransferRequest;
import com.sohosuite.backend.collaboration.dto.OwnershipTransferResponse;
import com.sohosuite.backend.collaboration.service.BusinessCollaborationService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OwnershipTransferController {
    private final BusinessCollaborationService service;
    public OwnershipTransferController(BusinessCollaborationService service) { this.service = service; }

    @PostMapping("/api/businesses/{businessId}/ownership-transfers")
    public OwnershipTransferResponse request(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @Valid @RequestBody OwnershipTransferRequest request) {
        return service.requestOwnershipTransfer(identity, businessId, request.newOwnerUserId());
    }

    @DeleteMapping("/api/businesses/{businessId}/ownership-transfers/{transferId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long transferId) {
        service.revokeOwnershipTransfer(identity, businessId, transferId);
    }

    @PostMapping("/api/ownership-transfers/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void accept(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @RequestBody TokenRequest request) {
        service.acceptOwnershipTransfer(identity, request.token());
    }

    public record TokenRequest(@NotBlank String token) { }
}
