package com.sohosuite.backend.exception;

public class ExportTooLargeException extends RuntimeException {
    public ExportTooLargeException() { super("Export exceeds the allowed row limit"); }
}
