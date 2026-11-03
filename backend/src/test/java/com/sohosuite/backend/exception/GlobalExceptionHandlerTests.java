package com.sohosuite.backend.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

class GlobalExceptionHandlerTests {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void missingIdempotencyHeaderIsAClientValidationError() {
        var response = handler.handleMissingHeader(
                new MissingRequestHeaderException("Idempotency-Key", parameter()));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("VALIDATION_ERROR", response.getBody().get("code"));
    }

    @Test
    void missingUploadPartIsAClientValidationError() {
        var response = handler.handleMissingPart(new MissingServletRequestPartException("file"));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("VALIDATION_ERROR", response.getBody().get("code"));
    }

    @Test
    void uploadSizeLimitUsesHttp413() {
        var response = handler.handleUploadTooLarge(new MaxUploadSizeExceededException(5_242_880));

        assertEquals(413, response.getStatusCode().value());
        assertEquals("FILE_TOO_LARGE", response.getBody().get("code"));
    }

    private static MethodParameter parameter() {
        try {
            return new MethodParameter(GlobalExceptionHandlerTests.class
                    .getDeclaredMethod("endpoint", String.class), 0);
        } catch (NoSuchMethodException exception) {
            throw new AssertionError(exception);
        }
    }

    private void endpoint(String header) { }
}
