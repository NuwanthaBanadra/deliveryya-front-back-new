package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.dto.BankDetailDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.entities.BankDetail;
import com.kaleox.deliveryya.repo.BankDetailRepo;
import com.kaleox.deliveryya.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class CompanyServiceImpl implements CompanyService {
    private final ModelMapper modelMapper;
    private final BankDetailRepo bankDetailRepo;


    @Override
    public List<BankDetailDto> getCompanyBankDetails(Boolean isActive) {
        List<BankDetail> companyBankDetails = isActive == null
                ? bankDetailRepo.findAllByIsCompanyAndIsActive(true, true)
                : bankDetailRepo.findAllByIsCompanyAndIsActive(true, isActive);

        return companyBankDetails.stream()
                .map(companyBankDetail -> {
                    BankDetailDto dto = modelMapper.map(companyBankDetail, BankDetailDto.class);
                    dto.setBalance(companyBankDetail.getBalance() != null ? companyBankDetail.getBalance() : 0.0);
                    dto.setBank(CommonIdNameDto.builder()
                            .id(companyBankDetail.getBank().getId())
                            .name(companyBankDetail.getBank().getName())
                            .build());
                    return dto;
                })
                .toList();
    }
}
