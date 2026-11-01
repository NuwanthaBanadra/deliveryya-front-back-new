package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SendOtpDto;
import com.kaleox.deliveryya.dto.SmsSingleDto;
import com.kaleox.deliveryya.dto.VerifyOtpDto;
import com.kaleox.deliveryya.entities.UserData;
import com.kaleox.deliveryya.repo.UserDataRepo;
import com.kaleox.deliveryya.service.OtpService;
import com.kaleox.deliveryya.service.SmsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements OtpService {

    private final UserDataRepo userDataRepo;
    private final SmsService smsService;
    private final HttpServletRequest request;
    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final SecureRandom random = new SecureRandom();

    @Override
    public ResponseDto<Void> sendOtpForBankDetail(SendOtpDto sendOtpDto) {
        Integer userId = sendOtpDto.getUserId();
        String operationType = sendOtpDto.getOperationType();

        // Validate operation type
        if (!"create".equals(operationType) && !"update".equals(operationType)) {
            throw new BusinessException("Invalid operation type. Must be 'create' or 'update'.", null);
        }

        // Get user's primary mobile number
        List<UserData> userDataList = userDataRepo.findByUsers_Id(userId);
        if (userDataList.isEmpty()) {
            throw new BusinessException("User data not found for user ID: " + userId, null);
        }

        UserData userData = userDataList.get(0);
        String primaryMobile = userData.getPrimaryMobile();
        
        if (primaryMobile == null || primaryMobile.trim().isEmpty()) {
            throw new BusinessException("Primary mobile number not found for user", null);
        }

        // Generate OTP
        String otp = generateOtp();

        // Store OTP in session with timestamp
        String sessionKey = getSessionKey(userId, operationType);
        var session = request.getSession(true);
        session.setAttribute(sessionKey + "_otp", otp);
        session.setAttribute(sessionKey + "_timestamp", System.currentTimeMillis());
        
        // Set session max inactive interval to 5 minutes
        session.setMaxInactiveInterval(OTP_EXPIRY_MINUTES * 60);

        // Verify storage
        String storedOtp = (String) session.getAttribute(sessionKey + "_otp");
        Long storedTimestamp = (Long) session.getAttribute(sessionKey + "_timestamp");
        
        log.info("OTP stored in session with key: {}, Session ID: {}, OTP: {}, Timestamp: {}", 
                sessionKey, session.getId(), storedOtp != null ? "exists" : "null", storedTimestamp);

        // Send OTP via SMS
        String message = String.format("Your verification code for bank detail %s is: %s. Valid for %d minutes.",
                operationType, otp, OTP_EXPIRY_MINUTES);

        SmsSingleDto smsDto = SmsSingleDto.builder()
                .contact(formatPhoneNumber(primaryMobile))
                .message(message)
                .build();

        smsService.sendSingleSms(smsDto);

        log.info("OTP sent to user {} for bank detail {}", userId, operationType);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("OTP sent successfully to your registered mobile number")
                .build();
    }

    @Override
    public ResponseDto<Void> verifyOtpForBankDetail(VerifyOtpDto verifyOtpDto) {
        Integer userId = verifyOtpDto.getUserId();
        String otp = verifyOtpDto.getOtp();
        String operationType = verifyOtpDto.getOperationType();

        // Validate operation type
        if (!"create".equals(operationType) && !"update".equals(operationType)) {
            throw new BusinessException("Invalid operation type. Must be 'create' or 'update'.", null);
        }

        String sessionKey = getSessionKey(userId, operationType);
        var session = request.getSession(false);
        
        if (session == null) {
            log.error("No session found for OTP verification. Session may have expired or cookies not sent.");
            throw new BusinessException("OTP not found or expired. Please request a new OTP.", null);
        }
        
        log.info("Attempting to verify OTP. Session key: {}, Session ID: {}", sessionKey, session.getId());
        
        String storedOtp = (String) session.getAttribute(sessionKey + "_otp");
        Long timestamp = (Long) session.getAttribute(sessionKey + "_timestamp");

        if (storedOtp == null || timestamp == null) {
            log.error("OTP or timestamp not found in session for key: {}, Session ID: {}", sessionKey, session.getId());
            throw new BusinessException("OTP not found or expired. Please request a new OTP.", null);
        }

        // Check OTP expiry
        long currentTime = System.currentTimeMillis();
        long expiryTime = timestamp + (OTP_EXPIRY_MINUTES * 60 * 1000L);
        
        if (currentTime > expiryTime) {
            session.removeAttribute(sessionKey + "_otp");
            session.removeAttribute(sessionKey + "_timestamp");
            log.error("OTP expired. Current time: {}, Expiry time: {}", currentTime, expiryTime);
            throw new BusinessException("OTP has expired. Please request a new OTP.", null);
        }

        // Verify OTP
        if (!storedOtp.equals(otp)) {
            log.error("OTP mismatch. Expected: {}, Received: {}", storedOtp, otp);
            throw new BusinessException("Invalid OTP. Please try again.", null);
        }

        // Clear OTP from session after successful verification
        session.removeAttribute(sessionKey + "_otp");
        session.removeAttribute(sessionKey + "_timestamp");
        
        log.info("OTP verified and cleared from session for key: {}", sessionKey);

        log.info("OTP verified successfully for user {} for bank detail {}", userId, operationType);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("OTP verified successfully")
                .build();
    }

    private String generateOtp() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(random.nextInt(10));
        }
        return otp.toString();
    }

    private String getSessionKey(Integer userId, String operationType) {
        return "bank_detail_otp_" + userId + "_" + operationType;
    }

    private String formatPhoneNumber(String phone) {
        // Ensure phone number starts with +
        if (!phone.startsWith("+")) {
            return "+" + phone;
        }
        return phone;
    }
}
