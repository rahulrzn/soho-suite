package com.sohosuite.backend.user;

import java.util.Map;

import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
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
    public User createProfile(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity,
            @Valid @RequestBody CreateUserProfileRequest request) {
        return userService.createProfile(identity, request);
    }

    @GetMapping("/me")
    public User getCurrentUser(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity) {
        return userService.getCurrentUser(identity.uid());
    }

    @PatchMapping("/me/profile")
    public User updateProfile(
            @RequestAttribute("firebaseIdentity") VerifiedFirebaseIdentity identity,
            @Valid @RequestBody UpdateProfileRequest request) {

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
