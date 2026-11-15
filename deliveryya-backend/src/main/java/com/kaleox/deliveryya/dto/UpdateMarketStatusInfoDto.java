package com.kaleox.deliveryya.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateMarketStatusInfoDto {

    @NotNull(message = "Market ID is required")
    Integer id;

    Boolean isActive;

    String infoMessage;
}

