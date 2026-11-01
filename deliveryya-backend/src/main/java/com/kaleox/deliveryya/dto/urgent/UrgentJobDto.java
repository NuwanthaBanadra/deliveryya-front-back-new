package com.kaleox.deliveryya.dto.urgent;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

public record UrgentJobDto(
        Integer id,
        String job,
        String desc,
        String mobile,
        String username,
        String nic,
        String email,

        CommonIdNameDto vehicle,
        CommonIdNameDto vehicleType,
        CommonIdNameDto jobStatus,
        CommonIdNameDto verificationStatus,

        Double cost,
        Double trip,
        String jobCode,
        LocalDateTime createdAt,
        String createdBy,
        LocalDateTime updatedAt,
        String updatedBy,

        List<UrgentJobItemDto> items
) implements Serializable {
}


