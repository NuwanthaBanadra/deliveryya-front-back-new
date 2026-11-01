package com.kaleox.deliveryya.dto.agentjob;

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
public class DeletePickUpRequestDto {

    @NotNull(message = "Pickup request ID is required")
    Integer pickupRequestId;
}

