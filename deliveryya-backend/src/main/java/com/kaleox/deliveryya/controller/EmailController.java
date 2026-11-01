package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.EmailDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/email")
public class EmailController {

    private final EmailService emailService;

    @PostMapping("/send-verify-email")
    public ResponseEntity<ResponseDto<Void>> sendVerifyEmail(@Valid @RequestBody EmailDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(emailService.sendVerificationEmail(dto))
                .build());

    }

    @PostMapping("/send-emails")
    public ResponseEntity<ResponseDto<Void>> sendEmails(@Valid @RequestBody EmailDto dto) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(emailService.sendEmail(dto))
                .build());
    }

    @GetMapping("/verify-email-by-token")
    public ResponseEntity<ResponseDto<Void>> verifyEmail(@RequestParam String token) {
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDto.<Void>builder()
                    .message("Error")
                    .desc("Verification field")
                    .exData(Map.of("error", "Token not received"))
                    .build());
        }

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(emailService.verifyEmailByToken(token))
                .build());
    }
}
