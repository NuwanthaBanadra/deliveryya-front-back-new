package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.EmailDto;

public interface EmailService {
    String sendVerificationEmail(EmailDto dto);

    String sendEmail(EmailDto dto);

    String verifyEmailByToken(String token);
}
