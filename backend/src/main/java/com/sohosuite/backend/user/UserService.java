package com.sohosuite.backend.user;

import java.util.Locale;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.sohosuite.backend.exception.EmailAlreadyExistsException;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import com.sohosuite.backend.exception.UserNotFoundException;
import com.sohosuite.backend.exception.UsernameAlreadyExistsException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.dto.CreateUserProfileRequest;
import com.sohosuite.backend.user.dto.UpdateProfileRequest;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createProfile(VerifiedFirebaseIdentity identity, CreateUserProfileRequest request) {
        User existingUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
        if (existingUser != null) {
            return existingUser;
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
        user.setPhone(request.getPhone());

        try {
            return userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            // The repository transaction has rolled back; another request may have won the insert.
            User concurrentUser = userRepository.findByFirebaseUid(identity.uid()).orElse(null);
            if (concurrentUser != null) {
                return concurrentUser;
            }
            checkAvailability(username, email);
            throw exception;
        }
    }

    public User getCurrentUser(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid)
                .orElseThrow(() ->
                        new UserNotFoundException("User not found"));
    }

    public User updateProfile(String firebaseUid, UpdateProfileRequest request) {
        User existingUser = getCurrentUser(firebaseUid);

        if (request.getFirstName() != null) {
            existingUser.setFirstName(request.getFirstName());
        }

        if (request.getLastName() != null) {
            existingUser.setLastName(request.getLastName());
        }

        if (request.getPhone() != null) {
            existingUser.setPhone(request.getPhone());
        }

        return userRepository.save(existingUser);
    }

    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username.toLowerCase(Locale.ROOT));
    }

    private void checkAvailability(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new UsernameAlreadyExistsException("Username already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new EmailAlreadyExistsException("Email already registered");
        }
    }
}
