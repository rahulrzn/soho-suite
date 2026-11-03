package com.sohosuite.backend.collaboration.dto;

import java.time.Instant;

public record InvitationResponse(long id, String email, String role, String status, Instant expiresAt,
        String token, String acceptancePath) { }
