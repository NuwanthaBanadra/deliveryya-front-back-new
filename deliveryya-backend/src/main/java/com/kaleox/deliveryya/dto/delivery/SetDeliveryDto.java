package com.kaleox.deliveryya.dto.delivery;

import com.kaleox.deliveryya.entities.Delivery;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link Delivery}
 */
@Data
@AllArgsConstructor
@Builder
@NoArgsConstructor
public class SetDeliveryDto implements Serializable {
    private Integer id;

    @Max(150)
    private String note;

    @NotEmpty
    private String orderCode;

    private Integer employeesId;
    @NotNull
    private Integer deliveryStatusId;

    private LocalDateTime createdAt;
}