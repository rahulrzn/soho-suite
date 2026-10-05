package com.sohosuite.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class FirebaseAuthenticationInterceptor implements HandlerInterceptor {

    private final FirebaseTokenVerifier tokenVerifier;

    public FirebaseAuthenticationInterceptor(FirebaseTokenVerifier tokenVerifier) {
        this.tokenVerifier = tokenVerifier;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        VerifiedFirebaseIdentity identity = tokenVerifier.verify(request.getHeader(HttpHeaders.AUTHORIZATION));
        request.setAttribute("firebaseIdentity", identity);
        return true;
    }
}
