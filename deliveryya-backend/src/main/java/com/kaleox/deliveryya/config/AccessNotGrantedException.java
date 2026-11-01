package com.kaleox.deliveryya.config;

import lombok.Getter;

import java.util.Map;

@Getter
public class AccessNotGrantedException extends RuntimeException {
    private final String errorMessage;
    private final Map<String, String> errors;

    public AccessNotGrantedException(String errorMessage, Map<String, String> errors) {
        super("Access not granted exception occurred");
        this.errorMessage = errorMessage;
        this.errors = errors;
    }
}
