package com.kaleox.deliveryya.dto.urgent;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Value;

import java.io.Serializable;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.UrgentJob}
 */

//Confidential data is not included in this DTO, as it is only used for non-confidential data transfer. For confidential data transfer, a separate DTO should be created.
@Value
public class CUrgentJobDto implements Serializable {
    Integer id;
    String message;
    Integer jobStatusId;
    Integer vehicleId;
    Integer verificationStatusId;
    Double cost;

    Double trip;

    @Size(max = 20)
    String jobCode;
    Integer vehicleTypeId;
    Integer paymentTypeId;
    Integer paymentStatusId;
}