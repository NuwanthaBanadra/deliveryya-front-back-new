package com.kaleox.deliveryya.config;

import com.kaleox.deliveryya.dto.ResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseDto<Void>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.BAD_REQUEST.value())
                        .message("Error").desc("Validation failed")
                        .exData(errors)
                        .build());
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ResponseDto<Void>> handleBusinessException(BusinessException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDto.<Void>builder().message("Error").desc(ex.getErrorMessage()).exData(ex.getErrors()).build());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ResponseDto<Void>> handleMissingParam(MissingServletRequestParameterException ex) {
        Map<String, String> error = new HashMap<>();
        error.put(ex.getParameterName(), "Parameter '" + ex.getParameterName() + "' is required");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.BAD_REQUEST.value())
                        .message("Error").desc("Missing request parameter")
                        .exData(error)
                        .build());
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ResponseDto<Void>> handleNoHandlerFound(NoHandlerFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.NOT_FOUND.value())
                        .message("Error")
                        .desc("Endpoint not found: " + ex.getRequestURL())
                        .build());
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ResponseDto<Void>> handleNoResourceFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.NOT_FOUND.value())
                        .message("Error")
                        .desc("Resource not found: " + ex.getResourcePath())
                        .build());
    }

    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<ResponseDto<Void>> handleAuthorizationDeniedException(AuthorizationDeniedException ex) {
//      ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.UNAUTHORIZED.value())
                        .message("Error")
                        .desc("Access declined. Please contact support")
                        .build());
    }

    @ExceptionHandler(AccessNotGrantedException.class)
    public ResponseEntity<ResponseDto<Void>> handleAccessNotGrantedException(AccessNotGrantedException ex) {
        int customStatus = 460;
        return ResponseEntity.status(HttpStatusCode.valueOf(customStatus))
                .body(ResponseDto.<Void>builder()
                        .status(customStatus)
                        .message("Error")
                        .desc(ex.getErrorMessage())
                        .exData(ex.getErrors())
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseDto<Void>> handleAnyOtherException(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResponseDto.<Void>builder()
                        .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                        .message("Error")
                        .desc("Internal Server error")
                        .build());
    }

//    @ExceptionHandler(AuthenticationException.class)
//    public ResponseEntity<ErrorResponseDto> handleAuthenticationException(AuthenticationException ex) {
//        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponseDto.builder().errorMessage("Unauthorized").build());
//    }

//    @ExceptionHandler(AuthenticationException.class)
//    public ResponseEntity<ErrorResponseDto> handleAuthenticationException(AuthenticationException ex) {
//        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ErrorResponseDto.builder().errorMessage("Unauthorized").build());
//    }

}
