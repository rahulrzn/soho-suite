package com.sohosuite.backend.exception;

public class DatasetIdempotencyConflictException extends RuntimeException {
    public DatasetIdempotencyConflictException(String message) {
        super(message);
    }
}
