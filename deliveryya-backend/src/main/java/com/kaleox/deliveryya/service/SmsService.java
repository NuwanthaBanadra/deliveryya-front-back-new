package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SmsBulkDto;
import com.kaleox.deliveryya.dto.SmsSingleDto;

public interface SmsService {
    ResponseDto<Void> sendSingleSms(SmsSingleDto dto);
    ResponseDto<Void> sendBulkSms(SmsBulkDto dto);
    ResponseDto<java.util.Map<String, Object>> getAccountStatus();
}
