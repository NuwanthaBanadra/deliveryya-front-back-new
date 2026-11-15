package com.kaleox.deliveryya.dto.vehicle;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
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
public class VehicleDto implements Serializable {

    Integer id;
    String name;
    String number;
    LocalDateTime licenseExp;
    CommonIdNameDto vehicleType;
}

