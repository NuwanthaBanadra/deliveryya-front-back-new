package com.kaleox.deliveryya.dto;

import com.kaleox.deliveryya.dto.urgent.UrgentJobDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OnHandSummaryDto {
    Double orderPrices;
    Double collectivePrices;
//    Double orderPayableAmount;
    Integer onHandUrgentJobCount;
    Double urgentJobValues;
//    Double urgentJobPayableAmount;
    Integer onHandOrderCount;

    List<UrgentJobDto> urgentJobList;
    List<OrderDto> orderList;

}

