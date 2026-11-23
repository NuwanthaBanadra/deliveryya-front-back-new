package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.CreateGroup;
import com.kaleox.deliveryya.dto.customDto.DeliveringUserHistoryDto;
import com.kaleox.deliveryya.dto.customDto.RequestOrderCode;
import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.dto.delivery.OrderCheckoutV2Dto;
import com.kaleox.deliveryya.dto.delivery.SetDeliveryDto;
import com.kaleox.deliveryya.dto.order.*;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrderCodeRequestDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrdersDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedThirdPartySendersDto;
import com.kaleox.deliveryya.service.OrderService;
import com.kaleox.deliveryya.service.ThirdPartySendersService;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;
    private final ThirdPartySendersService thirdPartySendersService;
    private final Validator validator;

    @GetMapping("/get-order-codes")
    public ResponseEntity<ResponseDto<List<OrderCodeDto>>> getOrderCodes(@AuthenticationPrincipal UserDetails userDetails,
                                                                         @RequestParam(required = false) Boolean isFilled,
                                                                         @RequestParam(required = false) Integer userId) {
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        Set<String> allowedRoles = Set.of(
                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_OWNER", "ROLE_MANAGER",
                "ROLE_MARKET_OWNER", "ROLE_SECRETORY", "ROLE_ACCOUNTS_MANAGER",
                "ROLE_ACCOUNT_ASSISTANT", "ROLE_MARKETS_MANAGER"
        );

        int authenticatedUserId = Integer.parseInt(userDetails.getUsername());
        Integer resolvedUserId = roles.stream().anyMatch(allowedRoles::contains) && userId != null && userId != 0
                ? userId
                : authenticatedUserId;

        return ResponseEntity.ok(orderService.getOrderCodes(resolvedUserId, isFilled));
    }

    @GetMapping("/get-orders-details-status")
    public ResponseEntity<ResponseDto> getOrdersTotalStatus(@AuthenticationPrincipal UserDetails userDetails, @RequestParam Integer id) {

        return ResponseEntity.ok(ResponseDto.builder()
                .message("Success")
                .desc("This Endpoint need to complete  after delivery status are completely finalized")
                .object(orderService.getOrdersTotalStatus(id == null || id == 0 ? Integer.parseInt(userDetails.getUsername()) : id))
                .build());
    }

    @GetMapping("/get-delivery-statuses")
    public ResponseEntity<ResponseDto<List<DeliveryStatusDto>>> getDeliveryStatuses(@RequestParam(required = false) Integer id) {

        return ResponseEntity.ok(orderService.getDeliveryStatuses(id));
    }

    @PostMapping("/get-orders")
    public ResponseEntity<ResponseDto> getOrders(@AuthenticationPrincipal UserDetails userDetails, @RequestBody PaginatedOrdersDto dto) {

//        if (dto.getOrderCodeUserId() == null) {
//            dto.setOrderCodeUserId(Integer.parseInt(userDetails.getUsername()));
//        }

        return ResponseEntity.ok(ResponseDto.builder()
                .message("success")
                .desc("Orders fetched successfully")
                .object(orderService.getOrders(dto))
                .build());
    }

    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','OWNER','MANAGER','MARKET_OWNER','SECRETORY','ACCOUNTS_MANAGER','ACCOUNT_ASSISTANT','MARKETS_MANAGER')")
    @PostMapping("/request-codes")
    public ResponseEntity<ResponseDto> requestCodes(@AuthenticationPrincipal UserDetails userDetails, @RequestBody @Valid RequestOrderCode requestOrderCode) {

        if (requestOrderCode.getUserId() == null) {
            requestOrderCode.setUserId(Integer.parseInt(userDetails.getUsername()));
        }

        return ResponseEntity.ok(orderService.requestCodes(requestOrderCode.getUserId(), requestOrderCode));
    }

    @PostMapping("/set-order-code-request")
    public ResponseEntity<ResponseDto<Void>> setOrderCodeRequest(@AuthenticationPrincipal UserDetails userDetails,
                                                                 @RequestBody @Valid RequestOrderCode requestOrderCode) {

        return ResponseEntity.ok(orderService.setOrderCodeRequest(Integer.parseInt(userDetails.getUsername()), requestOrderCode));
    }

    @DeleteMapping("/delete-order-code-request")
    public ResponseEntity<ResponseDto<Void>> deleteOrderCodeRequest(@AuthenticationPrincipal UserDetails userDetails,
                                                                    @RequestParam Integer requestId) {

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(orderService.deleteOrderCodeRequest(requestId, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PostMapping("/get-order-code-requests")
    public ResponseEntity<ResponseDto<PaginatedOrderCodeRequestDto>> getOrderCodeRequests(@AuthenticationPrincipal UserDetails userDetails,
                                                                                          @RequestBody @Valid PaginatedOrderCodeRequestDto dto) {
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        Set<String> allowedRoles = Set.of(
                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_OWNER", "ROLE_MANAGER",
                "ROLE_MARKET_OWNER", "ROLE_SECRETORY",
                "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNT_ASSISTANT", "ROLE_MARKETS_MANAGER"
        );

        if (roles.stream().noneMatch(allowedRoles::contains)) {
            dto.setUserId(Integer.parseInt(userDetails.getUsername()));
        }

        return ResponseEntity.ok(ResponseDto.<PaginatedOrderCodeRequestDto>builder()
                .message("Success")
                .desc("Order code requests fetched successfully")
                .object(orderService.getOrderCodeRequests(Integer.parseInt(userDetails.getUsername()), dto))
                .build());
    }

    @PutMapping("/update-order-code-request-printed")
    public ResponseEntity<ResponseDto<Void>> updateOrderCodeRequestPrinted(@AuthenticationPrincipal UserDetails userDetails,
                                                                           @RequestBody @Valid UpdateOrderCodeRequestPrintedDto dto) {

        return ResponseEntity.ok(orderService.updateOrderCodeRequestPrinted(Integer.parseInt(userDetails.getUsername()), dto));
    }

    @PostMapping("/set-order")
    public ResponseEntity<ResponseDto> setOrder(@AuthenticationPrincipal UserDetails userDetails, @RequestParam(required = false) Integer userId, @RequestBody @Validated({Default.class, CreateGroup.class}) OrderDto orderDto) {
        Map<String, String> errors = new java.util.HashMap<>();

        if (orderDto.getUserId() == null || userId == 0) {
            orderDto.setUserId(Integer.parseInt(userDetails.getUsername()));
        }

        if (orderDto.getPaymentType().getId() == null || orderDto.getPaymentType().getId() == 0) {
            errors.put("paymentType", "Payment type is required");
        }

        if (orderDto.getOrderCode().getId() == null || orderDto.getOrderCode().getId() == 0) {
            errors.put("orderCode", "Order code is required");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Validation failed", errors);
        }

        return ResponseEntity.ok(orderService.setOrder(orderDto));
    }

    //For checkout order, we need to send the delivery details and the order code,
    // and then the system will check if the order code is valid and if the delivery details are valid,
    // and then it will checkout the order and return the response.
    @PostMapping("/checkout-order")
    public ResponseEntity<ResponseDto<Void>> checkoutOrder(@AuthenticationPrincipal UserDetails userDetails,
                                                           @RequestBody @Valid SetDeliveryDto dto) {

        return ResponseEntity.ok(orderService.checkoutOrder(Integer.parseInt(userDetails.getUsername()), dto));
    }

    @PostMapping("/order-checkout-v2")
    public ResponseEntity<ResponseDto<Void>> checkoutOrderV2(@AuthenticationPrincipal UserDetails userDetails,
                                                             @RequestBody @Valid OrderCheckoutV2Dto dto) {

        return ResponseEntity.ok(orderService.checkoutOrderV2(Integer.parseInt(userDetails.getUsername()), dto));
    }

    @PostMapping("/set-market-order")
    public ResponseEntity<ResponseDto<List<OrderDto>>> setMarketOrder(@AuthenticationPrincipal UserDetails userDetails,
                                                                      @RequestBody @Valid SetMarketOrderDto dto) {

        return ResponseEntity.ok(ResponseDto.<List<OrderDto>>builder()
                .message("Success").object(orderService.setMarketOrder(Integer.parseInt(userDetails.getUsername()), dto))
                .build());
    }

//    @DeleteMapping("/delete-order-by-order-codes")
//    public ResponseEntity<ResponseDto<Void>> deleteOrderByOrderCodes(@RequestParam List<String> orderCodes, @RequestParam(defaultValue = "false") boolean force) {
//
//        return ResponseEntity.ok(ResponseDto.<Void>builder()
//                .message("Success")
//                .desc(orderService.deleteOrderByOrderCodes(orderCodes, force))
//                .build());
//    }

//    @GetMapping("/get-order-history-by-order-code")
//    public ResponseEntity<ResponseDto<OrderHistoryDto>> getOrderHistoryByOrderCode(@RequestParam String orderCode) {
//
//        return ResponseEntity.ok(ResponseDto.<OrderHistoryDto>builder()
//                .message("Success")
//                .object(orderService.getOrderHistoryByOrderCode(orderCode))
//                .build());
//    }

    @GetMapping("/get-market-order-details-by-id")
    public ResponseEntity<ResponseDto<MarketOrderDto>> getMarketOrderDetailsById(@RequestParam Integer id) {

        return ResponseEntity.ok(ResponseDto.<MarketOrderDto>builder()
                .message("Success")
                .desc("Market order details fetched successfully")
                .object(orderService.getMarketOrderDetailsById(id))
                .build());
    }

    @GetMapping("/get-delivery-history-by-order-code-or-id")
    public ResponseEntity<ResponseDto<List<DeliveryDto>>> getDeliveryHistoryByOrderCodeOrId(@RequestParam(required = false) String orderCode, @RequestParam(required = false) Integer orderId) {

        if ((orderCode == null || orderCode.isEmpty()) && (orderId == null || orderId == 0)) {
            throw new BusinessException("Either order code or order id must be provided", null);
        }

        return ResponseEntity.ok(ResponseDto.<List<DeliveryDto>>builder()
                .message("Success")
                .desc("Delivery history fetched successfully")
                .object(orderService.getDeliveryHistoryByOrderCodeOrId(orderCode, orderId))
                .build());
    }

    @GetMapping("/get-order-user-and-last-employee-details")
    public ResponseEntity<ResponseDto<OrderUserAndEmployeeDetailsDto>> getOrderUserAndLastEmployeeDetails(@RequestParam @Valid @NotNull @NotEmpty String orderCode) {
        return ResponseEntity.ok(ResponseDto.<OrderUserAndEmployeeDetailsDto>builder()
                .message("Success")
                .desc("Order user and employee details fetched successfully")
                .object(orderService.getOrderUserAndEmployeeDetailsByOrderCode(orderCode.trim()))
                .build());
    }

    @PostMapping("/get-third-party-senders")
    public ResponseEntity<ResponseDto<PaginatedThirdPartySendersDto>> getThirdPartySenders(@RequestBody @Valid PaginatedThirdPartySendersDto dto) {
        return ResponseEntity.ok(ResponseDto.<PaginatedThirdPartySendersDto>builder()
                .message("Success")
                .desc("Third party senders fetched successfully")
                .object(thirdPartySendersService.getThirdPartySenders(dto))
                .build());
    }

    @PutMapping("/update-third-party-sender")
    public ResponseEntity<ResponseDto<ThirdPartySendersDto>> updateThirdPartySender(@RequestBody @Valid ThirdPartySendersDto dto) {
        return ResponseEntity.ok(thirdPartySendersService.updateThirdPartySender(dto));
    }

    @DeleteMapping("/delete-third-party-sender")
    public ResponseEntity<ResponseDto<Void>> deleteThirdPartySender(@RequestParam Integer id) {
        return ResponseEntity.ok(thirdPartySendersService.deleteThirdPartySender(id));
    }

    @PutMapping("/update-delivery-to-details")
    public ResponseEntity<ResponseDto<Void>> updateDeliveryToDetails(@RequestBody @Valid UpdateDeliveryToDetailsDto dto) {
        return ResponseEntity.ok(orderService.updateDeliveryToDetails(dto));
    }

    @PutMapping("/update-order-details")
    public ResponseEntity<ResponseDto<Void>> updateOrderDetails(@RequestBody @Valid UpdateOrderDetailsDto dto) {
        return ResponseEntity.ok(orderService.updateOrderDetails(dto));
    }

    @GetMapping("/get-on-hand-orders")
    public ResponseEntity<ResponseDto<OnHandSummaryDto>> getOnHandOrders(@AuthenticationPrincipal UserDetails userDetails, @RequestParam(required = false) Integer userId) {

        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        Set<String> allowedRoles = Set.of(
                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_OWNER", "ROLE_MANAGER",
                "ROLE_CLIENT", "ROLE_MARKET_OWNER", "ROLE_SECRETORY",
                "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNT_ASSISTANT", "ROLE_MARKETS_MANAGER"
        );

        if (roles.stream().noneMatch(allowedRoles::contains)) {
            userId = Integer.parseInt(userDetails.getUsername());
        } else {
            if (userId == null || userId == 0) {
                throw new BusinessException("User ID is required for this role", Map.of("userId", "User ID is required"));
            }
        }


        return ResponseEntity.ok(ResponseDto.<OnHandSummaryDto>builder()
                .message("Success")
                .desc("On hand orders fetched successfully")
                .object(orderService.getOnHandOrders(userId))
                .build());
    }

    @PostMapping("/get-deliveryTo-history")
    public ResponseEntity<ResponseDto<DeliveringUserHistoryDto>> getDeliveringUsersHistory(@AuthenticationPrincipal UserDetails userDetails,
                                                                                           @RequestBody @Valid DeliveringUserHistoryDto deliveringUserHistoryDto) {

        return ResponseEntity.ok(ResponseDto.<DeliveringUserHistoryDto>builder()
                .message("Success")
                .desc("Delivery to history fetched successfully")
                .object(orderService.getDeliveringUsersHistory(deliveringUserHistoryDto, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @DeleteMapping("/drop-order-by-id")
    public ResponseEntity<ResponseDto<String>> dropOrderId(@RequestParam @Valid Integer orderId, @AuthenticationPrincipal UserDetails userDetails) {

        return ResponseEntity.ok(ResponseDto.<String>builder()
                .message("Success")
                .desc(orderService.dropOrder(orderId, Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @PutMapping("/update-delivery-status-by_order-id")
    public ResponseEntity<ResponseDto<String>> updateDeliveryStatus(@RequestParam @Valid Integer orderId, @RequestParam @Valid Integer deliveryStatusId) {

        return ResponseEntity.ok(ResponseDto.<String>builder()
                .message("Success")
                .desc(orderService.updateDeliveryStatus(orderId, deliveryStatusId))
                .build());
    }

//    @DeleteMapping("/user-delete-order")
//    public ResponseEntity<ResponseDto<String>> userDeleteOrder(@RequestParam @Valid Integer orderId, @AuthenticationPrincipal UserDetails userDetails) {
//
//        return ResponseEntity.ok(ResponseDto.<String>builder()
//                .message("Success")
//                .desc(orderService.userDeleteOrder(orderId, Integer.parseInt(userDetails.getUsername()), false))
//                .build());
//    }

    //    @GetMapping("/get-orders-dashbord-statuses")
    //    public ResponseEntity<ResponseDto<OrderDashboardSummaryDto>> getOrderDashboardStatuses(@AuthenticationPrincipal UserDetails userDetails) {
    //
    //        return ResponseEntity.ok(ResponseDto.<OrderDashboardSummaryDto>builder()
    //                .message("Success")
    //                .desc("Order dashboard statuses fetched successfully")
    //                .object(orderService.getOrderDashboardStatuses(Integer.parseInt(userDetails.getUsername())))
    //                .build());
    //    }
    //
    //    @PostMapping("/get-revenue-orders-trend")
    //    public ResponseEntity<ResponseDto<OrderRevenueTrendResponseDto>> getRevenueOrdersTrend(@AuthenticationPrincipal UserDetails userDetails,
    //                                                                                             @RequestBody @Valid OrderRevenueTrendRequestDto dto) {
    //        Set<String> roles = userDetails.getAuthorities().stream()
    //                .map(GrantedAuthority::getAuthority)
    //                .collect(Collectors.toSet());
    //
    //        Set<String> allowedRoles = Set.of(
    //                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_OWNER", "ROLE_MANAGER",
    //                "ROLE_MARKET_OWNER", "ROLE_SECRETORY", "ROLE_ACCOUNTS_MANAGER",
    //                "ROLE_ACCOUNT_ASSISTANT", "ROLE_MARKETS_MANAGER"
    //        );
    //
    //        Integer authenticatedUserId = Integer.parseInt(userDetails.getUsername());
    //        Integer requestedUserId = dto.getUserId();
    //        Integer resolvedUserId = roles.stream().anyMatch(allowedRoles::contains) && requestedUserId != null && requestedUserId != 0
    //                ? requestedUserId
    //                : authenticatedUserId;
    //
    //        dto.setUserId(resolvedUserId);
    //
    //        return ResponseEntity.ok(ResponseDto.<OrderRevenueTrendResponseDto>builder()
    //                .message("Success")
    //                .desc("Revenue and orders trend fetched successfully")
    //                .object(orderService.getRevenueOrdersTrend(dto))
    //                .build());
    //    }


}
