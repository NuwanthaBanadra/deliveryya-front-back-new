package com.kaleox.deliveryya.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReferenceValidationDto {
    private String code;
    private String type;
    private Integer referenceId;
    private String label;
}
