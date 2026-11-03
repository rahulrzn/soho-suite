package com.sohosuite.backend.activity.dto;

import java.util.List;

public record ActivityPageResponse(List<ActivityEventResponse> items, long total, int page, int size) { }
