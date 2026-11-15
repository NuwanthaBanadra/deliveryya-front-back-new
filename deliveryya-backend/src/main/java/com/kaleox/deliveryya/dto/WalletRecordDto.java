package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletRecordDto {

    private Integer id;

    private Double amount;

    private Double balance;

    private Boolean isActive;

    private Boolean isExpense;

    private CommonIdNameDto paymentCategory;

    private CommonIdNameDto paymentStatus;

    private String code;

    private String ref;

    private String otherReason;

    private String note;

    private Integer toOrFrom;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String createdBy;

    private String updatedBy;

    // For AgentWallet
    private CommonIdNameDto agent;

    // For ClientMarketOwnerWallet
    private CommonIdNameDto user;
}
