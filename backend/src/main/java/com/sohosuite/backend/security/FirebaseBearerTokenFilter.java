package com.sohosuite.backend.security;

import java.io.IOException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public final class FirebaseBearerTokenFilter extends OncePerRequestFilter {
    private final FirebaseTokenVerifier tokenVerifier;

    public FirebaseBearerTokenFilter(FirebaseTokenVerifier tokenVerifier) {
        this.tokenVerifier = tokenVerifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication existingAuthentication = SecurityContextHolder.getContext().getAuthentication();
        if (existingAuthentication != null) {
            if (!existingAuthentication.isAuthenticated()
                    || !(existingAuthentication.getPrincipal() instanceof VerifiedFirebaseIdentity identity)
                    || !hasWellFormedBearerHeader(request.getHeader(HttpHeaders.AUTHORIZATION))) {
                SecurityContextHolder.clearContext();
                reject(response);
                return;
            }
            if (!hasVerifiedEmail(identity) && !isVerificationSupportRoute(request)) {
                rejectEmailVerification(response);
                return;
            }
            chain.doFilter(request, response);
            return;
        }

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            reject(response);
            return;
        }
        VerifiedFirebaseIdentity identity;
        try {
            identity = tokenVerifier.verify(authorization);
        } catch (RuntimeException exception) {
            SecurityContextHolder.clearContext();
            reject(response);
            return;
        }
        if (!hasVerifiedEmail(identity) && !isVerificationSupportRoute(request)) {
            rejectEmailVerification(response);
            return;
        }
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                identity, null, AuthorityUtils.NO_AUTHORITIES);
        SecurityContextHolder.getContext().setAuthentication(authentication);
        try {
            chain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private boolean isVerificationSupportRoute(HttpServletRequest request) {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        return "GET".equals(request.getMethod())
                && ("/api/users/me".equals(path)
                    || "/api/users/check-username".equals(path));
    }

    private boolean hasVerifiedEmail(VerifiedFirebaseIdentity identity) {
        return identity.emailVerified() && identity.email() != null && !identity.email().isBlank();
    }

    private boolean hasWellFormedBearerHeader(String authorization) {
        if (authorization == null || !authorization.regionMatches(true, 0, "Bearer ", 0, 7)) return false;
        String token = authorization.substring(7).trim();
        return !token.isEmpty() && token.chars().noneMatch(Character::isWhitespace);
    }

    private void rejectEmailVerification(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":\"EMAIL_VERIFICATION_REQUIRED\",\"message\":\"Verify your email before continuing\"}");
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"A valid Firebase ID token is required\"}");
    }
}
