package com.kaleox.deliveryya.dto.delivery;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrderCheckoutV2Dto implements Serializable {

    @NotBlank
    private String orderCode;

    @NotNull
    private Integer deliveryStatusId;

    @Size(max = 150)
    private String note;

    @DecimalMin(value = "0.0", inclusive = false)
    private Double weight;

    @DecimalMin(value = "0.0", inclusive = true)
    private Double deliveryFee;

    private Boolean isWeightUpdated;

    @JsonAlias({"sendNotifcation"})
    private Boolean sendNotification;
}

