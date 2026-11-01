package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SendOtpDto;
import com.kaleox.deliveryya.dto.VerifyOtpDto;

public interface OtpService {
    ResponseDto<Void> sendOtpForBankDetail(SendOtpDto sendOtpDto);
    ResponseDto<Void> verifyOtpForBankDetail(VerifyOtpDto verifyOtpDto);
}
