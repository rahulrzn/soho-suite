package com.sohosuite.backend.collaboration.controller;

import com.sohosuite.backend.collaboration.dto.CreateInvitationRequest;
import com.sohosuite.backend.collaboration.dto.InvitationResponse;
import com.sohosuite.backend.collaboration.service.BusinessCollaborationService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class BusinessInvitationController {
    private final BusinessCollaborationService service;
    public BusinessInvitationController(BusinessCollaborationService service) { this.service = service; }

    @PostMapping("/api/businesses/{businessId}/invitations")
    public InvitationResponse create(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @Valid @RequestBody CreateInvitationRequest request) {
        return service.createInvitation(identity, businessId, request);
    }

    @GetMapping("/api/businesses/{businessId}/invitations")
    public List<InvitationResponse> list(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @PathVariable long businessId) {
        return service.listInvitations(identity, businessId);
    }

    @PostMapping("/api/businesses/{businessId}/invitations/{invitationId}/resend")
    public InvitationResponse resend(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long invitationId) {
        return service.rotateInvitation(identity, businessId, invitationId, false);
    }

    @DeleteMapping("/api/businesses/{businessId}/invitations/{invitationId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable long businessId, @PathVariable long invitationId) {
        service.rotateInvitation(identity, businessId, invitationId, true);
    }

    @PostMapping("/api/invitations/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void accept(@AuthenticationPrincipal VerifiedFirebaseIdentity identity, @RequestBody TokenRequest request) {
        service.acceptInvitation(identity, request.token());
    }

    public record TokenRequest(@NotBlank String token) { }
}
