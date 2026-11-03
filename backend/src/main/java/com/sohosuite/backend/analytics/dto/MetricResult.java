package com.sohosuite.backend.analytics.dto;

public record MetricResult<T>(MetricStatus status, T value, String reason) {

    public MetricResult {
        if (status == null) throw new IllegalArgumentException("Metric status is required");
        if (status == MetricStatus.AVAILABLE && (reason != null || value == null)) {
            throw new IllegalArgumentException("Available metrics require a value and cannot have an unavailable reason");
        }
        if (status != MetricStatus.AVAILABLE && (reason == null || reason.isBlank() || value != null)) {
            throw new IllegalArgumentException("Unavailable metrics require a reason and no numeric value");
        }
    }

    public static <T> MetricResult<T> available(T value) {
        return new MetricResult<>(MetricStatus.AVAILABLE, value, null);
    }

    public static <T> MetricResult<T> incomplete(String reason) {
        return new MetricResult<>(MetricStatus.INCOMPLETE, null, reason);
    }

    public static <T> MetricResult<T> unavailable(String reason) {
        return new MetricResult<>(MetricStatus.UNAVAILABLE, null, reason);
    }
}
