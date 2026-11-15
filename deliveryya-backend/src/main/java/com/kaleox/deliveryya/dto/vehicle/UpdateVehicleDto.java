package com.kaleox.deliveryya.dto.vehicle;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateVehicleDto implements Serializable {

    @NotNull(message = "Vehicle id is required")
    Integer id;

    @NotBlank(message = "Vehicle name is required")
    @Size(max = 45, message = "Vehicle name must not exceed 45 characters")
    String name;

    @NotBlank(message = "Vehicle number is required")
    @Size(max = 20, message = "Vehicle number must not exceed 20 characters")
    String number;

    @NotNull(message = "License expiry is required")
    LocalDateTime licenseExp;

    @NotNull(message = "Vehicle type is required")
    Integer vehicleTypeId;
}

