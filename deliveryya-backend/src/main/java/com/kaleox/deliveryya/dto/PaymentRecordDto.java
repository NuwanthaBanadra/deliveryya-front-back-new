package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.entities.PaymentRecord;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for {@link PaymentRecord}
 */
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentRecordDto implements Serializable {
    @NotNull
    Integer id;

    @NotNull
    @Min(0)
    Double amount;

    @NotEmpty
    @Size(max = 150)
    String desc;

    @NotEmpty
    @Size(max = 150)
    String proofUrl;

    @NotEmpty
    @Size(min = 1)
    List<PaymentRecordItemsDto> paymentRecordItems;

    CommonIdNameDto bankDetail;
    CommonIdNameDto verificationStatus;

    @NotNull
    @Valid
    CommonIdNameDto paymentType;

    CommonIdNameDto paymentCategory;

    @NotNull
    Boolean isReturn = false;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    String createdBy;
    String madeBy;
    String updatedBy;
}
