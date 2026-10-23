package com.sohosuite.backend.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.sohosuite.backend.exception.InvalidFirebaseTokenException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class FirebaseTokenVerifier {

    private final FirebaseAuth firebaseAuth;

    public FirebaseTokenVerifier(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    public VerifiedFirebaseIdentity verify(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new InvalidFirebaseTokenException();
        }
        String token = authorization.substring(7).trim();
        if (token.isEmpty() || token.chars().anyMatch(Character::isWhitespace)) {
            throw new InvalidFirebaseTokenException();
        }

        try {
            FirebaseToken verified = firebaseAuth.verifyIdToken(token, true);
            if (!StringUtils.hasText(verified.getUid())) {
                throw new InvalidFirebaseTokenException();
            }
            return new VerifiedFirebaseIdentity(
                    verified.getUid(), verified.getEmail(), verified.isEmailVerified());
        } catch (FirebaseAuthException | IllegalArgumentException exception) {
            // Never include the token or Firebase exception details in logs or responses.
            throw new InvalidFirebaseTokenException();
        }
    }
}
