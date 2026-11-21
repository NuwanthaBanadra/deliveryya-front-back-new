package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReferenceValidationRequestDto {
    @NotBlank
    private String code;
}
