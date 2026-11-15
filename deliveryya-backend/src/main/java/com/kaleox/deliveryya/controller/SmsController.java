package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SmsBulkDto;
import com.kaleox.deliveryya.dto.SmsSingleDto;
import com.kaleox.deliveryya.service.SmsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/sms")
public class SmsController {

    private final SmsService smsService;

    @PostMapping("/send-single")
    public ResponseEntity<ResponseDto<Void>> sendSingleSms(@Valid @RequestBody SmsSingleDto dto) {
        ResponseDto<Void> response = smsService.sendSingleSms(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send-bulk")
    public ResponseEntity<ResponseDto<Void>> sendBulkSms(@Valid @RequestBody SmsBulkDto dto) {
        ResponseDto<Void> response = smsService.sendBulkSms(dto);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/account-status")
    public ResponseEntity<ResponseDto<Map<String, Object>>> getAccountStatus() {
        ResponseDto<Map<String, Object>> response = smsService.getAccountStatus();
        return ResponseEntity.ok(response);
    }
}
