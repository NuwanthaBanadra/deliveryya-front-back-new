package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class SendOtpDto {

    @NotNull(message = "User ID is required")
    Integer userId;

    @NotNull(message = "Operation type is required")
    String operationType; // "create" or "update"
}
