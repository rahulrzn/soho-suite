package com.sohosuite.backend.user.service;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.security.access.prepost.PreAuthorize;

import com.sohosuite.backend.exception.EmailAlreadyExistsException;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import com.sohosuite.backend.exception.UserNotFoundException;
import com.sohosuite.backend.exception.UsernameAlreadyExistsException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateUserProfileRequest;
import com.sohosuite.backend.user.dto.UserProfileResponse;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public UserProfileResponse createProfile(VerifiedFirebaseIdentity identity, CreateUserProfileRequest request) {
        User existingUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
        if (existingUser != null) {
            return UserProfileResponse.from(existingUser);
        }

        if (!StringUtils.hasText(identity.email())) {
            throw new InvalidFirebaseTokenException();
        }
        String username = request.getUsername().toLowerCase(Locale.ROOT);
        String email = identity.email().toLowerCase(Locale.ROOT);
        checkAvailability(username, email);

        User user = new User();
        user.setFirebaseUid(identity.uid());
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());

        try {
            return UserProfileResponse.from(userRepository.saveAndFlush(user));
        } catch (DataIntegrityViolationException exception) {
            // The repository transaction has rolled back; another request may have won the insert.
            User concurrentUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
            if (concurrentUser != null) {
                return UserProfileResponse.from(concurrentUser);
            }
            checkAvailability(username, email);
            throw exception;
        }
    }

    public UserProfileResponse getCurrentUser(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid)
                .map(UserProfileResponse::from)
                .orElseThrow(() ->
                        new UserNotFoundException("User not found"));
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public UserProfileResponse updateProfile(String firebaseUid, UpdateUserProfileRequest request) {
        User existingUser = userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (request.getFirstName() != null) {
            existingUser.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            existingUser.setLastName(request.getLastName());
        }

        if (request.getPhoneNumber() != null) {
            existingUser.setPhoneNumber(request.getPhoneNumber());
        }

        return UserProfileResponse.from(userRepository.save(existingUser));
    }

    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username.toLowerCase(Locale.ROOT));
    }

    private void checkAvailability(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
    }
}
