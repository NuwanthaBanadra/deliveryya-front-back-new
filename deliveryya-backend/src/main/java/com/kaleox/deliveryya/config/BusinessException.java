package com.kaleox.deliveryya.config;

import lombok.Getter;

import java.util.Map;

@Getter
public class BusinessException extends RuntimeException {
    private final String errorMessage;
    private final Map<String, String> errors;

    public BusinessException(String errorMessage, Map<String, String> errors) {
        super("Business exception occurred");
        this.errorMessage = errorMessage;
        this.errors = errors;
    }
}
