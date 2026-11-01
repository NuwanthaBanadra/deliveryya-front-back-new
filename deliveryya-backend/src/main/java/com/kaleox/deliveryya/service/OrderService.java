package com.kaleox.deliveryya.service;


import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.DeliveringUserHistoryDto;
import com.kaleox.deliveryya.dto.customDto.RequestOrderCode;
import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.dto.delivery.OrderCheckoutV2Dto;
import com.kaleox.deliveryya.dto.delivery.SetDeliveryDto;
import com.kaleox.deliveryya.dto.order.*;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrderCodeRequestDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrdersDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;


public interface OrderService {
    ResponseDto setOrder(OrderDto orderDto);

    ResponseDto<Void> updateDeliveryToDetails(UpdateDeliveryToDetailsDto dto);

    ResponseDto<Void> updateOrderDetails(UpdateOrderDetailsDto dto);

    ResponseDto<List<OrderCodeDto>> getOrderCodes(Integer userId, Boolean isFilled);

    ResponseDto requestCodes(Integer userId, RequestOrderCode requestOrderCode);

    ResponseDto<Void> setOrderCodeRequest(Integer userId, RequestOrderCode requestOrderCode);

    String deleteOrderCodeRequest(Integer requestId, Integer userId);

    PaginatedOrderCodeRequestDto getOrderCodeRequests(Integer userId, PaginatedOrderCodeRequestDto dto);

    ResponseDto<Void> updateOrderCodeRequestPrinted(Integer userId, UpdateOrderCodeRequestPrintedDto dto);

    PaginatedOrdersDto getOrders(PaginatedOrdersDto dto);

    OrderDetailsStatusDto getOrdersTotalStatus(int i);

    ResponseDto<List<DeliveryStatusDto>> getDeliveryStatuses(Integer id);

    ResponseDto<Void> checkoutOrder(int userId, SetDeliveryDto dto);

    ResponseDto<Void> checkoutOrderV2(int userId, OrderCheckoutV2Dto dto);

    List<OrderDto> setMarketOrder(int userId, SetMarketOrderDto dto);

    String deleteOrderByOrderCodes(List<String> orderCodes, boolean force);

    OrderHistoryDto getOrderHistoryByOrderCode(String orderCode);

    MarketOrderDto getMarketOrderDetailsById(Integer id);

    List<DeliveryDto> getDeliveryHistoryByOrderCodeOrId(String orderCode, Integer orderId);

    OrderUserAndEmployeeDetailsDto getOrderUserAndEmployeeDetailsByOrderCode(String orderCode);

    OnHandSummaryDto getOnHandOrders(Integer userId);

    OrderDashboardSummaryDto getOrderDashboardStatuses(Integer userId);

    OrderRevenueTrendResponseDto getRevenueOrdersTrend(OrderRevenueTrendRequestDto dto);

    DeliveringUserHistoryDto getDeliveringUsersHistory(DeliveringUserHistoryDto deliveringUserHistoryDto, Integer userId);

    String dropOrder(@Valid @NotNull @Min(0) Integer orderId, Integer userId);

    String updateDeliveryStatus(@NotNull @Min(0) Integer orderId, @NotNull @Min(0) Integer deliveryStatusId);

    String userDeleteOrder(@Valid Integer orderId, int userId, boolean force);
}
