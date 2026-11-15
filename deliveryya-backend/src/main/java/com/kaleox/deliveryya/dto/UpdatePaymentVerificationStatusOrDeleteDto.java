package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdatePaymentVerificationStatusOrDeleteDto {

    @NotNull(message = "Payment record id is required")
    @Min(value = 1, message = "Payment record id must be greater than 0")
    Integer paymentRecordId;

    @Min(value = 1, message = "Verification status id must be greater than 0")
    Integer verificationStatusId;

    Boolean isDeleted;
}

