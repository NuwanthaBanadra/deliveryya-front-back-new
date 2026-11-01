package com.kaleox.deliveryya.dto.delivery;

import com.kaleox.deliveryya.dto.DeliveryStatusDto;
import com.kaleox.deliveryya.dto.OrderDto;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Value;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * DTO for {@link com.kaleox.deliveryya.entities.Delivery}
 */
@Value
@Builder
public class DeliveryDto implements Serializable {
    Integer id;
    @Size(max = 150)
    String note;
    @NotNull
    OrderDto orders;
    @NotNull
    DeliveryDto.EmployeeDto employees;
    @NotNull
    DeliveryStatusDto deliveryStatus;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    /**
     * DTO for {@link com.kaleox.deliveryya.entities.Employee}
     */
    @Builder
    @Value
    public static class EmployeeDto implements Serializable {
        Integer id;
        @Size(max = 100)
        String location;
        LocalDateTime createdAt;
        LocalDateTime updatedAt;
    }
}