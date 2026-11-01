package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SmsBulkDto;
import com.kaleox.deliveryya.dto.SmsSingleDto;
import com.kaleox.deliveryya.service.SmsService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class SmsServiceImpl implements SmsService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${sms.api.base-url}")
    private String baseUrl;

    @Value("${sms.api.user-id}")
    private String userId;

    @Value("${sms.api.api-key}")
    private String apiKey;

    @Value("${sms.api.sender-id}")
    private String senderId;

    @Override
    public ResponseDto<Void> sendSingleSms(SmsSingleDto dto) {
        try {
            String url = baseUrl + "/send-sms";

            String effectiveSenderId = (dto.getSenderId() != null && !dto.getSenderId().isBlank()) 
                    ? dto.getSenderId() 
                    : senderId;

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("user_id", userId);
            requestBody.put("api_key", apiKey);
            requestBody.put("sender_id", effectiveSenderId);
            requestBody.put("contact", dto.getContact());
            requestBody.put("message", dto.getMessage());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return ResponseDto.<Void>builder()
                        .status(200)
                        .message("Success")
                        .desc("SMS sent successfully")
                        .build();
            } else {
                throw new BusinessException("Failed to send SMS", null);
            }
        } catch (RestClientException e) {
            log.error("Error sending single SMS", e);
            throw new BusinessException("Error sending SMS: " + e.getMessage(), null);
        }
    }

    @Override
    public ResponseDto<Void> sendBulkSms(SmsBulkDto dto) {
        try {
            String url = baseUrl + "/send-bulk-sms";

            String effectiveSenderId = (dto.getSenderId() != null && !dto.getSenderId().isBlank()) 
                    ? dto.getSenderId() 
                    : senderId;

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("user_id", userId);
            requestBody.put("api_key", apiKey);
            requestBody.put("sender_id", effectiveSenderId);
            requestBody.put("contacts", dto.getContacts());
            requestBody.put("message", dto.getMessage());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return ResponseDto.<Void>builder()
                        .message("Success")
                        .desc("Bulk SMS sent successfully")
                        .build();
            } else {
                throw new BusinessException("Failed to send bulk SMS", null);
            }
        } catch (RestClientException e) {
            log.error("Error sending bulk SMS", e);
            throw new BusinessException("Error sending bulk SMS: " + e.getMessage(), null);
        }
    }

    @Override
    public ResponseDto<Map<String, Object>> getAccountStatus() {
        try {
            String url = baseUrl + "/account-status";

            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("user_id", userId);
            requestBody.put("api_key", apiKey);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseData = objectMapper.readValue(response.getBody(), Map.class);
                return ResponseDto.<Map<String, Object>>builder()
                        .message("Success")
                        .desc("Account status retrieved successfully")
                        .object(responseData)
                        .build();
            } else {
                throw new BusinessException("Failed to get account status", null);
            }
        } catch (RestClientException e) {
            log.error("Error getting account status", e);
            throw new BusinessException("Error getting account status: " + e.getMessage(), null);
        } catch (Exception e) {
            log.error("Error parsing account status", e);
            throw new BusinessException("Error parsing account status: " + e.getMessage(), null);
        }
    }
}
