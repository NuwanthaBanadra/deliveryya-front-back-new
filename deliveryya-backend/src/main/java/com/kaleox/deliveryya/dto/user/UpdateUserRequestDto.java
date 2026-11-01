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
public class UpdateUserRequestDto {

    @NotNull(message = "User request id is required")
    @Min(value = 1, message = "User request id must be greater than 0")
    Integer userRequestId;

    Boolean isRead;
    Boolean isAccepted;
}

