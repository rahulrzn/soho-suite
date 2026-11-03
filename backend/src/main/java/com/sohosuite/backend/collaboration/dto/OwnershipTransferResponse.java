package com.sohosuite.backend.collaboration.dto;
import java.time.Instant;
public record OwnershipTransferResponse(long id, long businessId, long currentOwnerUserId, long proposedOwnerUserId,
        String status, Instant expiresAt, String token, String acceptancePath) { }
