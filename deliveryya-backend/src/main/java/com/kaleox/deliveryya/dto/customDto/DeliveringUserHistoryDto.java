package com.kaleox.deliveryya.dto.customDto;

import com.kaleox.deliveryya.dto.DeliveryToDto;
import com.kaleox.deliveryya.dto.delivery.SetDeliveryDto;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@AllArgsConstructor
@Data
@NoArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DeliveringUserHistoryDto {

    @NotEmpty
    String search;

    @NotNull
    Integer pageNumber;

    @NotNull
    Integer countPerPage;

    Long totalCount;
    Integer totalPages;

    Integer successfulDeliveries;
    Integer failedDeliveries;

    List<DeliveryToDto> relatedDeliveriesDetails;
    Map<String, List<SetDeliveryDto>> failedDeliveriesDeliveryTimeLine;
}
