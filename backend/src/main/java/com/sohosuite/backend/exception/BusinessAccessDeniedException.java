package com.sohosuite.backend.exception;

public class BusinessAccessDeniedException extends RuntimeException {
    public BusinessAccessDeniedException() {
        super("You do not have permission for this business operation");
    }
}
