package com.sohosuite.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("firebaseEmailPolicy")
public class FirebaseEmailPolicy {
    public boolean isVerified() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof VerifiedFirebaseIdentity identity)) {
            return false;
        }
        return identity.emailVerified() && identity.email() != null && !identity.email().isBlank();
    }
}
