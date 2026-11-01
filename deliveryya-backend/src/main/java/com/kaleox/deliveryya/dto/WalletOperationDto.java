package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletOperationDto {

    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than 0")
    private Double amount;

    private Boolean isExpense;

    private Integer paymentCategoryId;

    private Integer paymentStatusId;

    private String code;

    private String ref;

    private String otherReason;

    private String note;

    private Integer toOrFrom;
}
