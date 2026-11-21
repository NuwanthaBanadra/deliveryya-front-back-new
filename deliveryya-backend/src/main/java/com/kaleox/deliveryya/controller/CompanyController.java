package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.BankDetailDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/company")
public class CompanyController {
    private final CompanyService companyService;

    @GetMapping("/get-company-bank-details")
    public ResponseEntity<ResponseDto<List<BankDetailDto>>> getCompanyBankDetails(@RequestParam(required = false) Integer userId, @RequestParam(required = false, defaultValue = "true") Boolean isActive) {

        return ResponseEntity.ok(ResponseDto.<List<BankDetailDto>>builder()
                .message("Success")
                .desc("Company bank details fetched successfully.")
                .object(companyService.getCompanyBankDetails(isActive))
                .build());
    }
}
