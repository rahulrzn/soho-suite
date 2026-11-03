package com.sohosuite.backend.activity.dto;

import java.time.Instant;

public record ActivityEventResponse(long id, Long actorUserId, String action, String targetType,
        String targetId, String summary, Instant occurredAt) { }
