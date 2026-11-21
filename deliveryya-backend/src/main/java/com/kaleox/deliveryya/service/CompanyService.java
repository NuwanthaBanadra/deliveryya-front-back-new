package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.BankDetailDto;

import java.util.List;

public interface CompanyService {
    List<BankDetailDto> getCompanyBankDetails(Boolean isActive);
}
