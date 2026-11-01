package com.kaleox.deliveryya.dto.user;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateVerificationDataStatusDto {

    @NotNull(message = "Verification data id is required")
    @Min(value = 1, message = "Verification data id must be greater than 0")
    Integer verificationDataId;

    @NotNull(message = "Verification status id is required")
    @Min(value = 1, message = "Verification status id must be greater than 0")
    Integer verificationStatusId;

    @Min(value = 1, message = "User id must be greater than 0")
    Integer userId;
}

