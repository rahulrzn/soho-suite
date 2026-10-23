package com.sohosuite.backend.business.controller;

import java.util.List;
import com.sohosuite.backend.business.dto.AddBusinessMemberRequest;
import com.sohosuite.backend.business.dto.BusinessMemberResponse;
import com.sohosuite.backend.business.dto.BusinessRequest;
import com.sohosuite.backend.business.dto.BusinessResponse;
import com.sohosuite.backend.business.dto.UpdateBusinessMemberRoleRequest;
import com.sohosuite.backend.business.service.BusinessService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/businesses")
public class BusinessController {

    private final BusinessService businessService;

    public BusinessController(BusinessService businessService) {
        this.businessService = businessService;
    }

    @PostMapping
    public BusinessResponse createBusiness(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @Valid @RequestBody BusinessRequest request) {
        return businessService.createBusiness(identity.uid(), request);
    }

    @GetMapping
    public List<BusinessResponse> getCurrentUserBusinesses(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity) {
        return businessService.getCurrentUserBusinesses(identity.uid());
    }

    @GetMapping("/{id}")
    public BusinessResponse getBusinessById(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId) {
        return businessService.getBusinessById(identity.uid(), businessId);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBusiness(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId) {
        businessService.deleteBusiness(identity.uid(), businessId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public BusinessResponse updateBusiness(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId,
            @Valid @RequestBody BusinessRequest request) {

        return businessService.updateBusiness(identity.uid(), businessId, request);
    }

    @GetMapping("/{id}/members")
    public List<BusinessMemberResponse> getMembers(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId) {
        return businessService.getMembers(identity.uid(), businessId);
    }

    @PostMapping("/{id}/members")
    public BusinessMemberResponse addMember(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId, @Valid @RequestBody AddBusinessMemberRequest request) {
        return businessService.addMember(identity.uid(), businessId, request);
    }

    @PatchMapping("/{id}/members/{userId}/role")
    public BusinessMemberResponse updateMemberRole(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId, @PathVariable Long userId,
            @Valid @RequestBody UpdateBusinessMemberRoleRequest request) {
        return businessService.updateMemberRole(identity.uid(), businessId, userId, request);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable("id") Long businessId, @PathVariable Long userId) {
        businessService.removeMember(identity.uid(), businessId, userId);
        return ResponseEntity.noContent().build();
    }
}
