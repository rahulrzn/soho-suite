package com.sohosuite.backend.exception;

public class MembershipConflictException extends RuntimeException {
    public MembershipConflictException(String message) {
        super(message);
    }
}
