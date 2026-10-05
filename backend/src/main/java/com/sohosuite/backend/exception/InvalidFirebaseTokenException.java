package com.sohosuite.backend.exception;

public class InvalidFirebaseTokenException extends RuntimeException {

    public InvalidFirebaseTokenException() {
        super("A valid Firebase ID token is required");
    }
}
