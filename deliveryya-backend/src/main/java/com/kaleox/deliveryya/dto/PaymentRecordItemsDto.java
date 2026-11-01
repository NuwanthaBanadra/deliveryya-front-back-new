package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.entities.PaymentRecordItems;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;

/**
 * DTO for {@link PaymentRecordItems}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentRecordItemsDto implements Serializable {
    Integer id;
    @NotNull
    String code;
    @NotNull
    String note;
    @NotNull
    @Min(0)
    Double amount;

    Integer paymentRecordId;
}