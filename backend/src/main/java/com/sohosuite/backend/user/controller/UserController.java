package com.sohosuite.backend.user.controller;

import java.util.Map;

import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateUserProfileRequest;
import com.sohosuite.backend.user.dto.UserProfileResponse;
import com.sohosuite.backend.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/profile")
    public UserProfileResponse createProfile(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @Valid @RequestBody CreateUserProfileRequest request) {
        return userService.createProfile(identity, request);
    }

    @GetMapping("/me")
    public UserProfileResponse getCurrentUser(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity) {
        return userService.getCurrentUser(identity.uid());
    }

    @PatchMapping("/me/profile")
    public UserProfileResponse updateProfile(
            @AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @Valid @RequestBody UpdateUserProfileRequest request) {

        return userService.updateProfile(identity.uid(), request);
    }

    @GetMapping("/check-username")
    public Map<String, Boolean> checkUsername(
            @RequestParam("username")
            @Size(min = 3, max = 30, message = "Username must be 3 to 30 characters")
            @Pattern(regexp = "[a-zA-Z0-9_]+", message = "Username may contain letters, digits and underscores only")
            String username) {
        return Map.of("available", userService.isUsernameAvailable(username));
    }
}
