package com.sohosuite.backend.exception;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessAccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleBusinessAccessDenied(BusinessAccessDeniedException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "code", "FORBIDDEN", "message", exception.getMessage()));
    }

    @ExceptionHandler(BusinessRequestException.class)
    public ResponseEntity<Map<String, String>> handleBusinessRequest(BusinessRequestException exception) {
        return ResponseEntity.badRequest().body(Map.of("code", "INVALID_BUSINESS_REQUEST", "message", exception.getMessage()));
    }

    @ExceptionHandler({BusinessConflictException.class, DataIntegrityViolationException.class})
    public ResponseEntity<Map<String, String>> handleBusinessConflict(Exception exception) {
        String message = exception instanceof BusinessConflictException
                ? exception.getMessage() : "A business record conflicts with existing data";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("code", "BUSINESS_CONFLICT", "message", message));
    }

    @ExceptionHandler(MembershipConflictException.class)
    public ResponseEntity<Map<String, String>> handleMembershipConflict(MembershipConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "MEMBERSHIP_CONFLICT", "message", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(
            MethodArgumentNotValidException exception) {

        Map<String, String> errors = new TreeMap<>();

        exception.getBindingResult()
                .getFieldErrors()
                .forEach(error -> errors.putIfAbsent(requestFieldName(exception.getBindingResult().getTarget(), error.getField()), error.getDefaultMessage()));

        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR",
                "errors", errors));
    }

    private String requestFieldName(Object target, String fieldName) {
        if (target == null) {
            return fieldName;
        }
        try {
            com.fasterxml.jackson.annotation.JsonProperty property = target.getClass()
                    .getDeclaredField(fieldName).getAnnotation(com.fasterxml.jackson.annotation.JsonProperty.class);
            return property != null && !property.value().isEmpty() ? property.value() : fieldName;
        } catch (NoSuchFieldException exception) {
            return fieldName;
        }
    }

    @ExceptionHandler(BusinessNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleBusinessNotFound(
            BusinessNotFoundException exception) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "BUSINESS_NOT_FOUND",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserNotFound(
            UserNotFoundException exception) {

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "USER_NOT_FOUND",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleEmailAlreadyExists(
            EmailAlreadyExistsException exception) {

        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "EMAIL_ALREADY_EXISTS",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<Map<String, String>> handleUsernameAlreadyExists(
            UsernameAlreadyExistsException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "USERNAME_ALREADY_EXISTS",
                "message", exception.getMessage()));
    }

    @ExceptionHandler(InvalidFirebaseTokenException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(InvalidFirebaseTokenException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer")
                .body(Map.of("code", "UNAUTHORIZED", "message", exception.getMessage()));
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<Map<String, Object>> handleParameterValidation(HandlerMethodValidationException exception) {
        Map<String, String> errors = new TreeMap<>();
        exception.getParameterValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error -> errors.putIfAbsent(
                    name == null ? "request" : name,
                    error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage()));
        });
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION_ERROR", "errors", errors));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(MissingServletRequestParameterException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of(exception.getParameterName(), "Value is required")));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleParameterTypeMismatch(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "message", "Invalid request parameter"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException exception) {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(Map.of(
                "code", "UNSUPPORTED_MEDIA_TYPE", "message", "Content type is not supported"));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> handleMissingHeader(MissingRequestHeaderException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of(exception.getHeaderName(), "Header is required")));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, Object>> handleMissingPart(MissingServletRequestPartException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of(exception.getRequestPartName(), "File part is required")));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleUploadTooLarge(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
                "code", "FILE_TOO_LARGE", "message", "The uploaded request exceeds the allowed size"));
    }

    @ExceptionHandler(ExportTooLargeException.class)
    public ResponseEntity<Map<String, String>> handleExportTooLarge(ExportTooLargeException exception) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(Map.of(
                "code", "EXPORT_TOO_LARGE", "message", "The requested export exceeds the allowed row limit"));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "code", "VALIDATION_ERROR", "errors", Map.of("request", "Invalid JSON request")));
    }

    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<Map<String, String>> handleRouteNotFound(Exception exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "code", "NOT_FOUND", "message", "Endpoint not found"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleInvalidImport(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("code", "VALIDATION_ERROR", "message", "Invalid request"));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> handleMissingDataset(NoSuchElementException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("code", "NOT_FOUND", "message", "Dataset not found"));
    }

    @ExceptionHandler(DatasetIdempotencyConflictException.class)
    public ResponseEntity<Map<String, String>> handleIdempotencyConflict(DatasetIdempotencyConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "code", "IDEMPOTENCY_CONFLICT", "message", exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnexpectedException(Exception exception) {
        // Exception messages and nested causes can contain rejected values, tokens,
        // SQL parameters, or uploaded row data. Keep the log entry sanitized too.
        log.error("Unexpected error while processing request (type={})", exception.getClass().getName());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "code", "INTERNAL_SERVER_ERROR",
                "message", "An unexpected error occurred"));
    }
}
