package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.WalletOperationDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.customDto.DeliveringUserHistoryDto;
import com.kaleox.deliveryya.dto.customDto.RequestOrderCode;
import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.dto.delivery.MarketOrderItemDto;
import com.kaleox.deliveryya.dto.delivery.OrderCheckoutV2Dto;
import com.kaleox.deliveryya.dto.delivery.SetDeliveryDto;
import com.kaleox.deliveryya.dto.order.*;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrderCodeRequestDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedOrdersDto;
import com.kaleox.deliveryya.dto.urgent.UrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.UrgentJobItemDto;
import com.kaleox.deliveryya.dto.user.NotificationTemplateDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.NotificationService;
import com.kaleox.deliveryya.service.OrderService;
import com.kaleox.deliveryya.service.PaymentService;
import com.kaleox.deliveryya.service.WalletService;
import com.kaleox.deliveryya.service.specification.OrderSpec;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.checkerframework.checker.nullness.qual.MonotonicNonNull;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class OrdersServiceImpl implements OrderService {

    private static final int ORDER_CODE_GENERATION_ATTEMPTS = 1_000;

    private final UserRepo userRepo;
    private final OrderCodeRepo orderCodeRepo;
    private final MarketRepo marketRepo;
    private final OrderRepo orderRepo;
    private final ModelMapper modelMapper;
    private final PaymentService paymentService;
    private final WalletService walletService;
    private final EmployeeRepo employeeRepo;
    private final DeliveryStatusRepo deliveryStatusRepo;
    private final DeliveryRepo deliveryRepo;
    private final StockRepo stockRepo;
    private final DeliveryToRepo deliveryToRepo;
    private final MarketOrderRepo marketOrderRepo;
    private final MarketOrderItemRepo marketOrderItemRepo;
    private final CityRepo cityRepo;
    private final AgentJobRepo agentJobRepo;
    private final UrgentJobItemRepo urgentJobItemRepo;
    private final OrderCodeRequestRepo orderCodeRequestRepo;
    private final ThirdPartySendersRepo thirdPartySendersRepo;
    private final NotificationService notificationService;
    private final ComplainRepo complainRepo;
    private final AgentWalletRepo agentWalletRepo;


    private StringBuilder generateOrderCode(User existing, int sequenceNumber) {
        StringBuilder code = new StringBuilder("ORD-");

        code.append("0".repeat(Math.max(0, (3 - existing.getId().toString().length()))));
        code.append(existing.getId());
        code.append("-");

        code.append("0".repeat(Math.max(0, (3 - Integer.toString(sequenceNumber).length()))));
        code.append(sequenceNumber);
        return code;
    }

    private int getNextOrderCodeSequence(User user) {
        return orderCodeRepo.findByUsers(user).stream()
                .map(OrderCode::getCode)
                .mapToInt(this::extractOrderCodeSequence)
                .max()
                .orElse(0) + 1;
    }

    private int extractOrderCodeSequence(String code) {
        String[] parts = code.split("-");
        if (parts.length < 3) {
            throw new BusinessException("Invalid order code format", Map.of("code", code));
        }

        try {
            return Integer.parseInt(parts[2]);
        } catch (NumberFormatException ex) {
            throw new BusinessException("Invalid order code format", Map.of("code", code));
        }
    }

    private String reserveNextOrderCode(User user, Set<String> reservedCodes, AtomicInteger nextSequence) {
        for (int attempts = 0; attempts < ORDER_CODE_GENERATION_ATTEMPTS; attempts++) {
            String code = generateOrderCode(user, nextSequence.getAndIncrement()).toString();
            if (reservedCodes.add(code)) {
                return code;
            }
        }

        throw new BusinessException("Could not generate a unique order code", Map.of("userId", String.valueOf(user.getId())));
    }

    @Override
    public ResponseDto setOrder(OrderDto orderDto) {
        userRepo.findById(orderDto.getUserId()).orElseThrow(() -> new BusinessException("User not found", null));
        OrderCode orderCode = orderCodeRepo.findById(orderDto.getOrderCode().getId()).orElseThrow(() -> new BusinessException("Order code not found", null));

        if (orderRepo.findByOrderCode_Id(orderDto.getOrderCode().getId()).isPresent() || orderCode.getField()) {
            throw new BusinessException("Order code has been used.", null);
        }

        Double deliveryFee = paymentService.getDeliveryCostByCityId(orderDto.getDeliveryTo().getCity().getId(), orderDto.getWeight() * orderDto.getQty());
        // Build Order using builder pattern to prevent mapping errors
        Order.OrderBuilder orderBuilder = Order.builder()
                .discount(orderDto.getDiscount())
                .qty(orderDto.getQty())
                .totalPrice(orderDto.getTotalPrice())
                .desc(orderDto.getDesc())
                .isDeleted(false)
                .weight(orderDto.getWeight())
                .paidAmount(orderDto.getPaidAmount() == null ? 0.0 : orderDto.getPaidAmount())
                .deliveryFee(deliveryFee);

        if (orderDto.getPaymentType().getId() == 1) {
            orderBuilder.collectivePrice(orderDto.getTotalPrice());
        }

        // Set MarketOrder if exists
//        if (orderDto.getMarketOrder() != null && orderDto.getMarketOrder().getId() != null) {
//            orderBuilder.marketOrder(MarketOrder.builder().id(orderDto.getMarketOrder().getId()).build());
//        }

        // Set PaymentType
        if (orderDto.getPaymentType() != null && orderDto.getPaymentType().getId() != null) {
            orderBuilder.paymentType(PaymentType.builder().id(orderDto.getPaymentType().getId()).build());
        }

        Order order = orderBuilder.build();

        if (orderDto.getThirdPartySenders() != null) {
            ThirdPartySendersDto senderDto = orderDto.getThirdPartySenders();
            if (senderDto.getId() != null && senderDto.getId() != 0) {
                ThirdPartySenders existingSender = thirdPartySendersRepo.findById(senderDto.getId())
                        .orElseThrow(() -> new BusinessException("Third party sender not found", null));
                order.setThirdPartySenders(existingSender);
            } else {
                ThirdPartySenders savedSender = thirdPartySendersRepo.save(ThirdPartySenders.builder()
                        .name(senderDto.getName())
                        .address(senderDto.getAddress())
                        .note(senderDto.getNote())
                        .nic(senderDto.getNic())
                        .first_mob(senderDto.getFirst_mob())
                        .sec_mob(senderDto.getSec_mob())
                        .whatsapp(senderDto.getWhatsapp())
                        .build());
                order.setThirdPartySenders(savedSender);
            }
        }

        orderCode.setField(true);
        order.setOrderCode(orderCode);

        //By Default set id for Ready to pickup which is id 2
        order.setDeliveryStatus(DeliveryStatus.builder().id(2).build());

        // Map DeliveryTo if exists
        if (orderDto.getDeliveryTo() != null) {
            DeliveryTo deliveryTo;
            DeliveryToDto deliveryToDto = orderDto.getDeliveryTo();

            if (deliveryToDto.getId() != null && deliveryToDto.getId() != 0) {
                // Find and use existing DeliveryTo
                deliveryTo = deliveryToRepo.findById(deliveryToDto.getId())
                        .orElseThrow(() -> new BusinessException("Delivery details not found", null));
            } else {
                // Create new DeliveryTo from provided details
                deliveryTo = DeliveryTo.builder()
                        .address(deliveryToDto.getAddress())
                        .primaryMobile(deliveryToDto.getPrimaryMobile())
                        .secondaryMobile(deliveryToDto.getSecondaryMobile())
                        .whatsapp(deliveryToDto.getWhatsapp())
                        .fullName(deliveryToDto.getFullName())
                        .location(deliveryToDto.getLocation())
                        .order(order)
                        .build();
            }

            // Set City
            deliveryTo.setCity(City.builder().id(deliveryToDto.getCity().getId()).build());

            // Set Order
            deliveryTo.setOrder(order);

            //Collective price is the price which we need to collect from customer. So delivery fee need to be added to it.
            order.setCollectivePrice(orderDto.getCollectivePrice() + (orderDto.getDontCollectDeliveryFeeFromCustomer() ? 0 : deliveryFee));
            order.setDontCollectDeliveryFeeFromCustomer(orderDto.getDontCollectDeliveryFeeFromCustomer());
            order.setPaymentStatus(PaymentStatus.builder().id(order.getPaidAmount() >= order.getCollectivePrice() ? 2 : 1).build());

            order.setDeliveryTo(deliveryTo);
        } else {
            throw new BusinessException("Delivery details are required for this order", null);
        }

        orderRepo.save(order);

        return ResponseDto.builder().message("Success").desc("Order successfully created.").build();
    }

    @Override
    public ResponseDto<Void> updateDeliveryToDetails(UpdateDeliveryToDetailsDto dto) {
        Order order = resolveOrderByIdOrCode(dto.getOrderId(), dto.getOrderCode());

        if (order.getDeliveryStatus() == null || !Objects.equals(order.getDeliveryStatus().getId(), 1)) {
            throw new BusinessException("Delivery details can only be updated when delivery status is pending (id = 1)", null);
        }

        if (order.getDeliveryTo() == null) {
            throw new BusinessException("Delivery details are missing for this order", null);
        }

        if (dto.getDeliveryTo().getCity() == null || dto.getDeliveryTo().getCity().getId() == null || dto.getDeliveryTo().getCity().getId() == 0) {
            throw new BusinessException("City is required", Map.of("city", "City id is required"));
        }

        DeliveryToDto deliveryToDto = dto.getDeliveryTo();
        DeliveryTo deliveryTo;

        if (deliveryToDto.getId() != null && deliveryToDto.getId() != 0) {
            // Find and use existing DeliveryTo by ID
            deliveryTo = deliveryToRepo.findById(deliveryToDto.getId())
                    .orElseThrow(() -> new BusinessException("Delivery details not found", null));
        } else {
            // Use the order's existing DeliveryTo
            deliveryTo = order.getDeliveryTo();
        }

        deliveryTo.setCity(City.builder().id(deliveryToDto.getCity().getId()).build());

        Double oldDeliveryFee = order.getDeliveryFee() == null ? 0.0 : order.getDeliveryFee();
        Double recalculatedDeliveryFee = paymentService.getDeliveryCostByCityId(deliveryToDto.getCity().getId(), order.getWeight() * order.getQty());
        order.setDeliveryFee(recalculatedDeliveryFee);
        order.setCollectivePrice(recalculateCollectivePrice(order, oldDeliveryFee));
        order.setPaymentStatus(PaymentStatus.builder().id(order.getPaidAmount() >= order.getCollectivePrice() ? 2 : 1).build());

        if (deliveryToDto.getUser() != null && deliveryToDto.getUser().getId() != null && deliveryToDto.getUser().getId() != 0) {
            deliveryTo.setUser(User.builder().id(deliveryToDto.getUser().getId()).build());
        }

        deliveryToRepo.save(deliveryTo);
        orderRepo.save(order);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Delivery details updated successfully")
                .build();
    }

    @Override
    public ResponseDto<Void> updateOrderDetails(UpdateOrderDetailsDto dto) {
        Order order = resolveOrderByIdOrCode(dto.getOrderId(), dto.getOrderCode());

        if (dto.getDiscount() != null) {
            order.setDiscount(dto.getDiscount());
        }
        if (dto.getQty() != null) {
            order.setQty(dto.getQty());
        }
        if (dto.getTotalPrice() != null) {
            order.setTotalPrice(dto.getTotalPrice());
        }
        if (dto.getDesc() != null) {
            order.setDesc(dto.getDesc());
        }
        if (dto.getWeight() != null) {
            order.setWeight(dto.getWeight());
        }
        if (dto.getPaidAmount() != null) {
            order.setPaidAmount(dto.getPaidAmount());
        }
        if (dto.getDontCollectDeliveryFeeFromCustomer() != null) {
            order.setDontCollectDeliveryFeeFromCustomer(dto.getDontCollectDeliveryFeeFromCustomer());
        }
        if (dto.getPaymentTypeId() != null && dto.getPaymentTypeId() != 0) {
            order.setPaymentType(PaymentType.builder().id(dto.getPaymentTypeId()).build());
        }

        applyThirdPartySenderUpdate(order, dto.getThirdPartySenders(), dto.getRemoveThirdPartySender());

        order.setCollectivePrice((order.getTotalPrice() == null ? 0.0 : order.getTotalPrice()) +
                (Boolean.TRUE.equals(order.getDontCollectDeliveryFeeFromCustomer()) ? 0.0 : (order.getDeliveryFee() == null ? 0.0 : order.getDeliveryFee())));
        order.setPaymentStatus(PaymentStatus.builder().id(order.getPaidAmount() >= order.getCollectivePrice() ? 2 : 1).build());

        orderRepo.save(order);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Order details updated successfully")
                .build();
    }

    @Override
    public ResponseDto<List<OrderCodeDto>> getOrderCodes(Integer userId, Boolean isFilled) {

        List<OrderCode> orderCodeList = orderCodeRepo.findAll(OrderSpec.getOrderCodeSpecification(userId, isFilled));

        List<OrderCodeDto> orderCodeDtoList = new ArrayList<>();
        for (OrderCode orderCode : orderCodeList) {
            orderCodeDtoList.add(OrderCodeDto.builder().id(orderCode.getId()).code(orderCode.getCode()).field(orderCode.getField()).build());
        }

        return ResponseDto.<List<OrderCodeDto>>builder().message("Success").desc("Code retrieved successful").object(orderCodeDtoList).build();
    }

    @Override
    public ResponseDto<List<String>> requestCodes(Integer userId, RequestOrderCode requestOrderCode) {
        OrderCodeRequest orderCodeRequest = orderCodeRequestRepo.findById(requestOrderCode.getOrderCodeRequestId()).orElseThrow(() -> new BusinessException("Order code request not found", null));
        User existing = orderCodeRequest.getUser();

        if (orderCodeRequest.getIsGenerated()) {
            throw new BusinessException("Order Codes already generated", null);
        }

        List<String> codes = new ArrayList<>();
        Set<String> reservedCodes = orderCodeRepo.findByUsers(existing).stream()
                .map(OrderCode::getCode)
                .collect(Collectors.toCollection(HashSet::new));
        AtomicInteger nextSequence = new AtomicInteger(getNextOrderCodeSequence(existing));

        for (int i = 0; i < orderCodeRequest.getQty(); i++) {
            String code = reserveNextOrderCode(existing, reservedCodes, nextSequence);

            codes.add(code);
            orderCodeRepo.save(OrderCode.builder()
                    .users(existing)
                    .orderCodeRequest(orderCodeRequest)
                    .field(false)
                    .code(code)
                    .build());
        }

        orderCodeRequest.setIsGenerated(true);
        orderCodeRequestRepo.save(orderCodeRequest);

        return ResponseDto.<List<String>>builder()
                .message("Success")
                .desc("Order Code Generation Successful")
                .object(codes)
                .build();
    }

    @Override
    public ResponseDto<Void> setOrderCodeRequest(Integer userId, RequestOrderCode requestOrderCode) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        orderCodeRequestRepo.save(OrderCodeRequest.builder()
                .qty(requestOrderCode.getQty())
                .printed(false)
                .isGenerated(false)
                .printedBarcodesNeeded(Boolean.TRUE.equals(requestOrderCode.getPrintedBarcodesNeeded()))
                .user(user)
                .build());

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Order code request submitted successfully")
                .build();
    }

    @Override
    public String deleteOrderCodeRequest(Integer requestId, Integer userId) {
        OrderCodeRequest request = orderCodeRequestRepo.findById(requestId)
                .orElseThrow(() -> new BusinessException("Order code request not found", null));

        if (!request.getUser().getId().equals(userId)) {
            throw new BusinessException("You are not authorized to delete this order code request", null);
        }

        orderCodeRequestRepo.delete(request);
        return "Order code request deleted successfully";
    }

    @Override
    public PaginatedOrderCodeRequestDto getOrderCodeRequests(Integer userId, PaginatedOrderCodeRequestDto dto) {
        if (dto.getPageNumber() < 0) {
            throw new BusinessException("Invalid page number", Map.of("pageNumber", "Page number must be 0 or greater"));
        }

        if (dto.getCountPerPage() == null || dto.getCountPerPage() < 1) {
            throw new BusinessException("Invalid page size", Map.of("countPerPage", "Count per page must be at least 1"));
        }

        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").descending());

        Specification<OrderCodeRequest> spec = OrderSpec.getOrderCodeRequestSpecification(dto);

        Page<OrderCodeRequest> requests = orderCodeRequestRepo.findAll(spec, pageable);

        List<OrderCodeRequestDto> mapOrderCodeRequestDto = requests.getContent()
                .stream()
                .map(request -> {
                    OrderCodeRequestDto codeRequestDto = modelMapper.map(request, OrderCodeRequestDto.class);

                    List<String> orderCodes = orderCodeRepo.findByOrderCodeRequest_Id(request.getId())
                            .stream()
                            .map(OrderCode::getCode)
                            .toList();

                    codeRequestDto.setOrderCodes(orderCodes);

                    return codeRequestDto;
                })
                .toList();


        dto.setTotalCount(requests.getTotalElements());
        dto.setTotalPages(requests.getTotalPages());
        dto.setItems(mapOrderCodeRequestDto);

        return dto;
    }

    @Override
    public ResponseDto<Void> updateOrderCodeRequestPrinted(Integer userId, UpdateOrderCodeRequestPrintedDto dto) {
        OrderCodeRequest request = orderCodeRequestRepo.findById(dto.getRequestId())
                .orElseThrow(() -> new BusinessException("Order code request not found", null));

        if (!request.getUser().getId().equals(userId)) {
            throw new BusinessException("You are not authorized to update this order code request", null);
        }

        request.setPrinted(dto.getPrinted());
        orderCodeRequestRepo.save(request);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Order code request printed status updated successfully")
                .build();
    }

    @Override
    public PaginatedOrdersDto getOrders(PaginatedOrdersDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").descending());

        Specification<Order> spec = OrderSpec.getOrderSpecification(dto);

        Page<Order> orders = orderRepo.findAll(spec, pageable);

        dto.setTotalCount(orders.getTotalElements());
        dto.setTotalPages(orders.getTotalPages());
        dto.setCountPerPage(orders.getSize());

        List<OrderDto> orderDtoList = orders.getContent().stream().map(order -> {
            // Build OrderDto using builder pattern to prevent mapping errors
            OrderDto.OrderDtoBuilder orderDtoBuilder = OrderDto.builder()
                    .id(order.getId())
                    .discount(order.getDiscount())
                    .deliveryFee(order.getDeliveryFee())
                    .collectivePrice(order.getCollectivePrice())
                    .paidAmount(order.getPaidAmount())
                    .qty(order.getQty())
                    .totalPrice(order.getTotalPrice())
                    .desc(order.getDesc())
                    .createdAt(order.getCreatedAt())
                    .dontCollectDeliveryFeeFromCustomer(order.getDontCollectDeliveryFeeFromCustomer())
                    .weight(order.getWeight());


            // Map MarketOrder if exists
            if (order.getMarketOrder() != null) {
                MarketOrderDto marketOrderDto = new MarketOrderDto();
                marketOrderDto.setId(order.getMarketOrder().getId());
                marketOrderDto.setQty(order.getMarketOrder().getQty());
                marketOrderDto.setPrice(order.getMarketOrder().getPrice());

                // Map market order user if exists
                if (order.getMarketOrder().getUser() != null) {
                    marketOrderDto.setUser(UserDto.builder().id(order.getMarketOrder().getUser().getId()).build());
                }
                orderDtoBuilder.marketOrder(marketOrderDto);
            }

            orderDtoBuilder.paymentStatus(modelMapper.map(order.getPaymentStatus(), CommonIdNameDto.class));
            orderDtoBuilder.paymentType(modelMapper.map(order.getPaymentType(), CommonIdNameDto.class));
            orderDtoBuilder.deliveryStatus(modelMapper.map(order.getDeliveryStatus(), DeliveryStatusDto.class));

            orderDtoBuilder.orderCode(OrderCodeDto.builder().id(order.getOrderCode().getId()).code(order.getOrderCode().getCode()).field(order.getOrderCode().getField()).users(UserDto.builder().id(order.getOrderCode().getUsers().getId()).build()).build());

            if (order.getDeliveryTo() != null) {
                DeliveryToDto deliveryToDto = DeliveryToDto.builder()
                        .id(order.getDeliveryTo().getId())
                        .address(order.getDeliveryTo().getAddress())
                        .primaryMobile(order.getDeliveryTo().getPrimaryMobile())
                        .secondaryMobile(order.getDeliveryTo().getSecondaryMobile())
                        .whatsapp(order.getDeliveryTo().getWhatsapp())
                        .fullName(order.getDeliveryTo().getFullName())
                        .location(order.getDeliveryTo().getLocation())
                        .build();

                deliveryToDto.setCity(modelMapper.map(order.getDeliveryTo().getCity(), CommonIdNameDto.class));

                if (order.getDeliveryTo().getUser() != null) {
                    deliveryToDto.setUser(CommonIdNameDto.builder().id(order.getDeliveryTo().getUser().getId()).build());
                }

                orderDtoBuilder.deliveryTo(deliveryToDto);
            }

            if (order.getThirdPartySenders() != null) {
                ThirdPartySenders sender = order.getThirdPartySenders();
                orderDtoBuilder.thirdPartySenders(new ThirdPartySendersDto(
                        sender.getId(),
                        sender.getName(),
                        sender.getAddress(),
                        sender.getNote(),
                        sender.getNic(),
                        sender.getFirst_mob(),
                        sender.getSec_mob(),
                        sender.getWhatsapp(),
                        sender.getCreatedAt(),
                        sender.getUpdatedAt(),
                        sender.getCreatedBy(),
                        sender.getUpdatedBy()
                ));
            }

            return orderDtoBuilder.build();
        }).toList();

        dto.setItems(orderDtoList);

        return dto;
    }

    @Override
    public OrderDetailsStatusDto getOrdersTotalStatus(int i) {


        return null;
    }

    @Override
    public ResponseDto<List<DeliveryStatusDto>> getDeliveryStatuses(Integer id) {
        if (id != null && id != 0) {
            DeliveryStatus deliveryStatus = deliveryStatusRepo.findById(id).orElseThrow(() -> new BusinessException("Delivery status not found", null));

            return ResponseDto.<List<DeliveryStatusDto>>builder()
                    .message("Success")
                    .desc("Delivery statuses retrieved successfully")
                    .object(List.of(modelMapper.map(deliveryStatusRepo.findById(id).orElseThrow(() -> new BusinessException("Delivery status not found", null)), DeliveryStatusDto.class)))
                    .build();
        }

        return ResponseDto.<List<DeliveryStatusDto>>builder()
                .message("Success")
                .desc("Delivery statuses retrieved successfully")
                .object(deliveryStatusRepo.findAll().stream()
                        .map(deliveryStatus -> modelMapper.map(deliveryStatus, DeliveryStatusDto.class))
                        .toList())
                .build();
    }

    @Override
    public ResponseDto<Void> checkoutOrder(int userId, SetDeliveryDto dto) {
        Order order = orderRepo.findByOrderCode_code(dto.getOrderCode()).orElseThrow(() -> new BusinessException("Order not found", null));
        Employee employee = employeeRepo.findByUsers_Id(userId).orElseThrow(() -> new BusinessException("Employee not found", null));
        DeliveryStatus deliveryStatus = deliveryStatusRepo.findById(dto.getDeliveryStatusId()).orElseThrow(() -> new BusinessException("Delivery status not found not found", null));

        deliveryRepo.save(Delivery.builder().note(dto.getNote()).employees(employee).orders(order).deliveryStatus(deliveryStatus).build());
        return ResponseDto.<Void>builder().message("Success").desc("Delivery updated").build();
    }

    @Override
    public ResponseDto<Void> checkoutOrderV2(int userId, OrderCheckoutV2Dto dto) {
        String orderCode = dto.getOrderCode() == null ? null : dto.getOrderCode().trim();
        Order order = orderRepo.findByOrderCode_code(orderCode)
                .orElseThrow(() -> new BusinessException("Order not found", null));
        Employee employee = employeeRepo.findByUsers_Id(userId)
                .orElseThrow(() -> new BusinessException("Employee not found", null));
        DeliveryStatus deliveryStatus = deliveryStatusRepo.findById(dto.getDeliveryStatusId())
                .orElseThrow(() -> new BusinessException("Delivery status not found", null));

        order.setDeliveryStatus(deliveryStatus);

        if (Boolean.TRUE.equals(dto.getIsWeightUpdated())) {
            Map<String, String> errors = new HashMap<>();
            if (dto.getWeight() == null) {
                errors.put("weight", "Required when isWeightUpdated is true");
            }
            if (dto.getDeliveryFee() == null) {
                errors.put("deliveryFee", "Required when isWeightUpdated is true");
            }
            if (!errors.isEmpty()) {
                throw new BusinessException("Validation failed", errors);
            }

            order.setWeight(dto.getWeight());
            order.setDeliveryFee(dto.getDeliveryFee());
        }

        orderRepo.save(order);

        deliveryRepo.save(Delivery.builder()
                .note(dto.getNote())
                .employees(employee)
                .orders(order)
                .deliveryStatus(deliveryStatus)
                .build());

        // Credit AgentWallet for COD collection when order is delivered by agent
        // Only applies to COD orders (paymentType=1) with delivery status "Delivered By Agent" (id=7)
//        if (order.getPaymentType() != null && Objects.equals(order.getPaymentType().getId(), 1) &&
//            Objects.equals(deliveryStatus.getId(), 7)) {
//            creditAgentWalletForCodCollection(order, employee.getUsers().getId());
//        }

        if (Boolean.TRUE.equals(dto.getSendNotification())) {
            String noteMessage = dto.getNote() == null ? "" : dto.getNote().trim();
            if (noteMessage.isEmpty()) {
                throw new BusinessException("Validation failed", Map.of("note", "Note is required when sendNotification is true"));
            }

            Set<Integer> toUserIds = new LinkedHashSet<>();
            if (order.getOrderCode() != null && order.getOrderCode().getUsers() != null) {
                toUserIds.add(order.getOrderCode().getUsers().getId());
            }

            if (order.getMarketOrder() != null && order.getMarketOrder().getUser() != null) {
                toUserIds.add(order.getMarketOrder().getUser().getId());
            }

            if (toUserIds.isEmpty()) {
                throw new BusinessException("No notification recipient found for this order", null);
            }

            NotificationTemplateDto notificationDto = NotificationTemplateDto.builder()
                    .title("Order Update")
                    .notificationType("MESSAGE")
                    .message(noteMessage)
                    .toUsers(new ArrayList<>(toUserIds))
                    .build();

            try {
                notificationService.sendNotification(notificationDto);
            } catch (BusinessException ex) {
                log.warn("Checkout v2 completed but notification failed for order {}: {}", order.getOrderCode().getCode(), ex.getMessage());
            }
        }

        return ResponseDto.<Void>builder().message("Success").desc("Order checked out successfully").build();
    }

    @Override
    public List<OrderDto> setMarketOrder(int userId, SetMarketOrderDto dto) {
        List<OrderDto> res = new ArrayList<>();

        Map<Integer, Double> totalPrice = new HashMap<>();
        Map<Integer, Double> qty = new HashMap<>();
        Map<Integer, Double> weight = new HashMap<>();
        Map<Integer, List<MarketOrderItem>> marketOrderItems = new HashMap<>();

        for (SetMarketOrderDto.Stock stockDto : dto.getStocks()) {
            Stock existingStock = stockRepo.findById(stockDto.getId())
                    .orElseThrow(() -> new BusinessException("Stock not found", null));

            if (existingStock.getQty() < stockDto.getQty()) {
                throw new BusinessException("Not enough stock for item",
                        Map.of("Color", existingStock.getColor(),
                                "Size", existingStock.getSizes() == null ? "" : existingStock.getSizes().getName(),
                                "Available Quantity", existingStock.getQty().toString()));
            }

            existingStock.setQty(existingStock.getQty() - stockDto.getQty());
            stockRepo.save(existingStock);

            Integer marketId = stockRepo.findMarketIdByStockId(existingStock.getId()).orElseThrow(() -> new BusinessException("Market Could not be found", null));

            totalPrice.put(marketId, totalPrice.getOrDefault(marketId, 0.0) + (existingStock.getSellingPrice() * stockDto.getQty()));
            qty.put(marketId, qty.getOrDefault(marketId, 0.0) + stockDto.getQty());
            weight.put(marketId, weight.getOrDefault(marketId, 0.0) + (existingStock.getWpu() * stockDto.getQty()));

            List<MarketOrderItem> currentItemList = marketOrderItems.getOrDefault(marketId, new ArrayList<>());
            currentItemList.add(MarketOrderItem.builder()
                    .stock(existingStock)
                    .qty(stockDto.getQty())
                    .price(existingStock.getSellingPrice())
                    .build());

            marketOrderItems.put(marketId, currentItemList);
        }

        totalPrice.keySet().forEach(marketId -> {
            Double deliveryFee = paymentService.getDeliveryCostByCityId(dto.getDeliveryTo().getCity().getId(), weight.get(marketId));

            User marketOwner = marketRepo.findById(marketId).orElseThrow(() -> new BusinessException("User not found", null)).getUsers();
            Set<String> reservedCodes = orderCodeRepo.findByUsers(marketOwner).stream()
                    .map(OrderCode::getCode)
                    .collect(Collectors.toCollection(HashSet::new));
            AtomicInteger nextSequence = new AtomicInteger(getNextOrderCodeSequence(marketOwner));
            String code = reserveNextOrderCode(marketOwner, reservedCodes, nextSequence);


            User orderedUser = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

            MarketOrder savedMarketOrder = marketOrderRepo.save(MarketOrder.builder()
                    .qty(qty.get(marketId))
                    .user(orderedUser)
                    .price(totalPrice.get(marketId))
                    .discount(getDiscount(dto.getCuponCode()))
                    .build());

            marketOrderItems.get(marketId).forEach(marketOrderItem -> marketOrderItem.setMarketOrder(savedMarketOrder));

            marketOrderItemRepo.saveAll(marketOrderItems.get(marketId));

            Order savedOrder = orderRepo.save(Order.builder()
                    .qty(qty.get(marketId))
                    .totalPrice(totalPrice.get(marketId))
                    .discount(getDiscount(dto.getCuponCode()))
                    .deliveryFee(deliveryFee)
                    .paidAmount(0.0)
                    .weight(weight.get(marketId))
                    .dontCollectDeliveryFeeFromCustomer(false)
                    .isDeleted(false)
                    //Pending By Default which is id 1
                    .deliveryStatus(DeliveryStatus.builder().id(1).build())

                    //Pending By Default which is id 1
                    .paymentStatus(PaymentStatus.builder().id(1).build())
                    .paymentType(PaymentType.builder().id(dto.getPaymentType().getId()).build())
                    .collectivePrice(totalPrice.get(marketId) + deliveryFee)

                    .orderCode(orderCodeRepo.save(OrderCode.builder().users(marketOwner).field(true).code(code).build()))

                    .marketOrder(savedMarketOrder)

                    .build());

            DeliveryTo savedDeliveryTo;
            DeliveryToDto deliveryToDto = dto.getDeliveryTo();

            if (deliveryToDto.getId() != null && deliveryToDto.getId() != 0) {
                // Find and use existing DeliveryTo
                savedDeliveryTo = deliveryToRepo.findById(deliveryToDto.getId())
                        .orElseThrow(() -> new BusinessException("Delivery details not found", null));
            } else {
                // Create new DeliveryTo from provided details
                savedDeliveryTo = deliveryToRepo.save(DeliveryTo.builder()
                        .order(savedOrder)
                        .address(deliveryToDto.getAddress())
                        .primaryMobile(deliveryToDto.getPrimaryMobile())
                        .secondaryMobile(deliveryToDto.getSecondaryMobile())
                        .whatsapp(deliveryToDto.getWhatsapp())
                        .location(deliveryToDto.getLocation())
                        .city(City.builder().id(deliveryToDto.getCity().getId()).build())
                        .fullName(orderedUser.getFirstName() + " " + orderedUser.getLastName())
                        .user(orderedUser)
                        .build());
            }

            // Set order reference
            savedDeliveryTo.setOrder(savedOrder);

            res.add(OrderDto.builder()
                    .collectivePrice(savedOrder.getCollectivePrice())
                    .deliveryFee(savedOrder.getDeliveryFee())
                    .discount(savedOrder.getDiscount())
                    .paidAmount(savedOrder.getPaidAmount())
                    .id(savedOrder.getId())
                    .orderCode(
                            OrderCodeDto.builder()
                                    .id(savedOrder.getOrderCode().getId())
                                    .code(savedOrder.getOrderCode().getCode())
                                    .field(savedOrder.getOrderCode().getField())
                                    .users(
                                            UserDto.builder()
                                                    .id(savedOrder.getOrderCode().getUsers().getId())
                                                    .build()
                                    )
                                    .build()
                    )
                    .paymentStatus(
                            CommonIdNameDto.builder()
                                    .id(savedOrder.getPaymentStatus().getId())
                                    .name(savedOrder.getPaymentStatus().getName())
                                    .build()
                    )
                    .paymentType(
                            CommonIdNameDto.builder()
                                    .id(savedOrder.getPaymentType().getId())
                                    .name(savedOrder.getPaymentType().getName())
                                    .build()
                    )
                    .deliveryStatus(
                            DeliveryStatusDto.builder()
                                    .id(savedOrder.getDeliveryStatus().getId())
                                    .name(savedOrder.getDeliveryStatus().getName())
                                    .build()
                    )
                    .qty(savedOrder.getQty())
                    .totalPrice(savedOrder.getTotalPrice())
                    .weight(savedOrder.getWeight())
                    .deliveryTo(
                            DeliveryToDto.builder()
                                    .id(savedDeliveryTo.getId())
                                    .address(savedDeliveryTo.getAddress())
                                    .primaryMobile(savedDeliveryTo.getPrimaryMobile())
                                    .secondaryMobile(savedDeliveryTo.getSecondaryMobile())
                                    .whatsapp(savedDeliveryTo.getWhatsapp())
                                    .location(savedDeliveryTo.getLocation())
                                    .city(
                                            CommonIdNameDto.builder()
                                                    .id(savedDeliveryTo.getCity().getId())
                                                    .name(cityRepo.findById(savedDeliveryTo.getCity().getId()).orElseThrow(() -> new BusinessException("City not found", null)).getName())
                                                    .build()
                                    )
                                    .fullName(savedDeliveryTo.getFullName())
                                    .build()
                    )
                    .user(UserDto.builder()
                            .id(orderedUser.getId())
                            .firstName(orderedUser.getFirstName())
                            .lastName(orderedUser.getLastName())
                            .email(orderedUser.getEmail())
                            .nic(orderedUser.getNic())
                            .build())
                    .build()
            );

        });

        return res;
    }

    @Override
    public String deleteOrderByOrderCodes(@MonotonicNonNull List<String> orderCodes, boolean force) {

        for (String code : orderCodes) {
            orderRepo.findByOrderCode_code(code.trim()).ifPresentOrElse(order -> {
                // If force delete is enabled, delete all related records
                if (force) {
                    log.info("Force deleting order with code: {} and all related records", code);

                    // Delete all deliveries associated with this order
                    List<Delivery> deliveries = deliveryRepo.findAllByOrdersOrderByCreatedAtDesc(order);
                    if (!deliveries.isEmpty()) {
                        deliveryRepo.deleteAll(deliveries);
                        log.info("Deleted {} delivery records for order code: {}", deliveries.size(), code);
                    }

                    // Delete all delivery-to records
                    if (order.getDeliveryTo() != null) {
                        deliveryToRepo.delete(order.getDeliveryTo());
                        log.info("Deleted delivery-to record for order code: {}", code);
                    }

                    // Delete all complaints associated with this order code
                    List<Complain> complains = complainRepo.findAllByCode(order.getOrderCode().getCode());
                    if (!complains.isEmpty()) {
                        complainRepo.deleteAll(complains);
                        log.info("Deleted {} complaint records for order code: {}", complains.size(), code);
                    }
                } else {

                }

                order.setPaymentStatus(PaymentStatus.builder().id(2).build());

                marketOrderRepo.findById(order.getMarketOrder() != null ? order.getMarketOrder().getId() : 0).ifPresent(marketOrder -> {
                    marketOrderItemRepo.deleteAllByMarketOrder(marketOrder);
                    marketOrderRepo.delete(marketOrder);
                });

                try {
                    orderRepo.delete(order);
                } catch (Exception e) {
//                    throw new BusinessException("Error occurred while deleting order", null);
                    order.setIsDeleted(true);
                }

                if (force) {
                    log.info("Successfully force deleted order with code: {} and all related records", code);
                } else {
                    log.info("Deleted order with code: {}", code);
                }
            }, () -> {
                throw new BusinessException("Order not found for code: " + code, null);
            });
        }

        return force ? "Order and all related records deleted successfully" : "Order Deleted Successfully";
    }

    @Override
    public MarketOrderDto getMarketOrderDetailsById(Integer id) {
        MarketOrder marketOrder = marketOrderRepo.findById(id).orElseThrow(() -> new BusinessException("Market order not found", null));
        List<MarketOrderItemDto> itemDtoList = marketOrderItemRepo.findAllByMarketOrder(marketOrder).stream().map(marketOrderItem -> MarketOrderItemDto.builder()
                .id(marketOrderItem.getId())
                .price(marketOrderItem.getPrice())
                .qty(marketOrderItem.getQty())
                .stockId(marketOrderItem.getStock().getId())
                .build()).toList();

        MarketOrderDto marketOrderDto = MarketOrderDto.builder()
                .id(marketOrder.getId())
                .price(marketOrder.getPrice())
                .qty(marketOrder.getQty())
                .discount(marketOrder.getDiscount())
                .items(itemDtoList)
                .build();

        return marketOrderDto;
    }

    @Override
    public List<DeliveryDto> getDeliveryHistoryByOrderCodeOrId(String orderCode, Integer orderId) {
        Order order = null;

        if (orderCode != null && !orderCode.isEmpty()) {
            order = orderRepo.findByOrderCode_code(orderCode)
                    .orElseThrow(() -> new BusinessException("Order not found", null));
        }

        if (orderId != null && orderId != 0) {
            order = orderRepo.findById(orderId)
                    .orElseThrow(() -> new BusinessException("Order not found", null));
        }

        List<Delivery> deliveries = deliveryRepo.findAllByOrdersOrderByCreatedAtDesc(order);

        // Get the latest delivery record to extract location
        String latestDeliveryLocation = null;
        if (!deliveries.isEmpty()) {
            latestDeliveryLocation = deliveries.get(0).getEmployees().getLocation();
        }

        final String latestLocation = latestDeliveryLocation;

        return deliveries.stream()
                .map(delivery -> {
                    DeliveryDto.EmployeeDto.EmployeeDtoBuilder employeeDtoBuilder = DeliveryDto.EmployeeDto.builder()
                            .id(delivery.getEmployees().getId());

                    // Set location only for the latest delivery record
                    if (delivery.getId().equals(deliveries.get(0).getId())) {
                        employeeDtoBuilder.location(latestLocation);
                    }

                    return DeliveryDto.builder()
                            .id(delivery.getId())
                            .note(delivery.getNote())
                            .employees(employeeDtoBuilder.build())
                            .deliveryStatus(DeliveryStatusDto.builder()
                                    .id(delivery.getDeliveryStatus().getId())
                                    .name(delivery.getDeliveryStatus().getName())
                                    .build())
                            .createdAt(delivery.getCreatedAt())
                            .build();
                })
                .toList();
    }

    @Override
    public OrderUserAndEmployeeDetailsDto getOrderUserAndEmployeeDetailsByOrderCode(String orderCode) {
        Order order = orderRepo.findByOrderCode_code(orderCode)
                .orElseThrow(() -> new BusinessException("Order not found", null));

        Delivery lastDelivery = deliveryRepo.findFirstByOrdersOrderByIdDesc(order)
                .orElseThrow(() -> new BusinessException("No delivery records found for this order", null));

        Employee employee = lastDelivery.getEmployees();
        if (employee == null || employee.getUsers() == null) {
            throw new BusinessException("Employee details not found for this order", null);
        }

        User orderUser = order.getOrderCode() != null ? order.getOrderCode().getUsers() : null;
        if (orderUser == null) {
            throw new BusinessException("User details not found for this order", null);
        }

        User employeeUser = employee.getUsers();

        OrderUserAndEmployeeDetailsDto.UserDetailsDto orderUserDto = OrderUserAndEmployeeDetailsDto.UserDetailsDto.builder()
                .id(orderUser.getId())
                .firstName(orderUser.getFirstName())
                .lastName(orderUser.getLastName())
                .email(orderUser.getEmail())
                .nic(orderUser.getNic())
                .profileImg(orderUser.getProfileImg())
                .isActive(orderUser.getIsActive())
                .emailVerified(orderUser.getEmailVerified())
                .isEmployee(orderUser.getIsEmployee())
                .build();

        OrderUserAndEmployeeDetailsDto.UserDetailsDto employeeUserDto = OrderUserAndEmployeeDetailsDto.UserDetailsDto.builder()
                .id(employeeUser.getId())
                .firstName(employeeUser.getFirstName())
                .lastName(employeeUser.getLastName())
                .email(employeeUser.getEmail())
                .nic(employeeUser.getNic())
                .profileImg(employeeUser.getProfileImg())
                .isActive(employeeUser.getIsActive())
                .emailVerified(employeeUser.getEmailVerified())
                .isEmployee(employeeUser.getIsEmployee())
                .build();

        OrderUserAndEmployeeDetailsDto.EmployeeDetailsDto employeeDto = OrderUserAndEmployeeDetailsDto.EmployeeDetailsDto.builder()
                .id(employee.getId())
                .location(employee.getLocation())
                .liveLocation(employee.getLiveLocation())
                .mobile(employee.getMobile())
                .whatsapp(employee.getWhatsapp())
                .verificationStatus(employee.getVerificationStatus() == null ? null : CommonIdNameDto.builder()
                                                                                      .id(employee.getVerificationStatus().getId())
                                                                                      .name(employee.getVerificationStatus().getName())
                                                                                      .build())
                .branch(employee.getBranches() == null ? null : CommonIdNameDto.builder()
                                                                .id(employee.getBranches().getId())
                                                                .name(employee.getBranches().getName())
                                                                .build())
                .user(employeeUserDto)
                .build();

        return OrderUserAndEmployeeDetailsDto.builder()
                .orderCode(order.getOrderCode() == null ? orderCode : order.getOrderCode().getCode())
                .user(orderUserDto)
                .employee(employeeDto)
                .deliveryStatus(DeliveryStatusDto.builder()
                        .id(lastDelivery.getDeliveryStatus().getId())
                        .name(lastDelivery.getDeliveryStatus().getName())
                        .build())
                .lastUpdatedAt(lastDelivery.getUpdatedAt() != null ? lastDelivery.getUpdatedAt() : lastDelivery.getCreatedAt())
                .build();
    }

    @Override
    public OnHandSummaryDto getOnHandOrders(Integer userId) {
        Employee employee = employeeRepo.findByUsers_Id(userId).orElseThrow(() -> new BusinessException("Employee not found", null));
        List<Delivery> deliveries = deliveryRepo.findOnHandOrders(employee.getId());

        final Double[] orderPrices = {0.0};
        final Double[] collectivePrices = {0.0};
        final Integer[] onHandOrderCount = {0};

        List<OrderDto> orderDtoList = deliveries.stream()
                .map(delivery -> {
                    Order order = delivery.getOrders();
                    onHandOrderCount[0]++;

                    orderPrices[0] += order.getTotalPrice();
                    collectivePrices[0] += order.getCollectivePrice();

                    return OrderDto.builder()
                            .id(order.getId())
                            .discount(order.getDiscount())
                            .deliveryFee(order.getDeliveryFee())
                            .collectivePrice(order.getCollectivePrice())
                            .paidAmount(order.getPaidAmount())
                            .qty(order.getQty())
                            .totalPrice(order.getTotalPrice())
                            .desc(order.getDesc())
                            .createdAt(order.getCreatedAt())
                            .weight(order.getWeight())
                            .thirdPartySenders(mapThirdPartySenderDto(order.getThirdPartySenders()))
                            .deliveryTo(mapDeliveryToDto(order.getDeliveryTo()))
                            .paymentStatus(modelMapper.map(order.getPaymentStatus(), CommonIdNameDto.class))
                            .paymentType(modelMapper.map(order.getPaymentType(), CommonIdNameDto.class))
                            .deliveryStatus(modelMapper.map(order.getDeliveryStatus(), DeliveryStatusDto.class))
                            .orderCode(OrderCodeDto.builder().id(order.getOrderCode().getId()).code(order.getOrderCode().getCode()).field(order.getOrderCode().getField()).users(UserDto.builder().id(order.getOrderCode().getUsers().getId()).build()).build())
                            .build();
                })
                .toList();

        List<AgentJob> agentJobs = agentJobRepo.findByEmployeesAndUrgentJob_PaymentStatus_IdIsNot(employee, 2);
        final Integer[] onHandUrgentJobCount = {0};
        final Double[] urgentJobValues = {0.0};

        List<Integer> urgentJobIds = agentJobs.stream()
                .map(agentJob -> agentJob.getUrgentJob().getId())
                .toList();

        Map<Integer, List<UrgentJobItem>> itemsByJobId = new HashMap<>();
        if (!urgentJobIds.isEmpty()) {
            itemsByJobId = urgentJobItemRepo.findByUrgentJobs_IdIn(urgentJobIds).stream()
                    .collect(Collectors.groupingBy(item -> item.getUrgentJobs().getId()));
        }

        Map<Integer, List<UrgentJobItem>> finalItemsByJobId = itemsByJobId;

        List<UrgentJobDto> urgentJobList = agentJobs.stream()
                .map(agentJob -> {
                    UrgentJob urgentJob = agentJob.getUrgentJob();
                    onHandUrgentJobCount[0]++;
                    urgentJobValues[0] += urgentJob.getCost() == null ? 0 : urgentJob.getCost();

                    List<UrgentJobItemDto> itemDtos = finalItemsByJobId.getOrDefault(urgentJob.getId(), Collections.emptyList()).stream()
                            .map(item -> UrgentJobItemDto.builder()
                                    .id(item.getId())
                                    .location(item.getLocation())
                                    .task(item.getTask())
                                    .beAt(item.getBeAt())
                                    .expectedTimeDuration(item.getExpectedTimeDuration())
                                    .spentDuration(item.getSpentDuration())
                                    .build())
                            .toList();

                    return new UrgentJobDto(
                            urgentJob.getId(),
                            urgentJob.getJob(),
                            urgentJob.getDesc(),
                            urgentJob.getMobile(),
                            urgentJob.getUsername(),
                            urgentJob.getNic(),
                            urgentJob.getEmail(),

                            urgentJob.getVehicle() != null ?
                                    new CommonIdNameDto(urgentJob.getVehicle().getId(), urgentJob.getVehicle().getName()) : null,
                            urgentJob.getVehicleType() != null ?
                                    new CommonIdNameDto(urgentJob.getVehicleType().getId(), urgentJob.getVehicleType().getName()) : null,
                            urgentJob.getJobStatus() != null ?
                                    new CommonIdNameDto(urgentJob.getJobStatus().getId(), urgentJob.getJobStatus().getName()) : null,
                            urgentJob.getVerificationStatus() != null ?
                                    new CommonIdNameDto(urgentJob.getVerificationStatus().getId(), urgentJob.getVerificationStatus().getName()) : null,

                            urgentJob.getCost(),
                            urgentJob.getTrip(),
                            urgentJob.getJobCode(),
                            urgentJob.getCreatedAt(),
                            urgentJob.getCreatedBy(),
                            urgentJob.getUpdatedAt(),
                            urgentJob.getUpdatedBy(),
                            itemDtos
                    );
                })
                .toList();

        return OnHandSummaryDto.builder()
                .orderPrices(orderPrices[0])
                .collectivePrices(collectivePrices[0])
                .onHandUrgentJobCount(onHandUrgentJobCount[0])
                .urgentJobValues(urgentJobValues[0])
                .onHandOrderCount(onHandOrderCount[0])
                .urgentJobList(urgentJobList)
                .orderList(orderDtoList)
                .build();
    }

    @Override
    public OrderDashboardSummaryDto getOrderDashboardStatuses(Integer userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        Object[] overall = orderRepo.findOverallAggregatesByUserId(user.getId());

        long totalOrderCount = toLong(overall[0]);
        double totalOrderValue = toDouble(overall[1]);
        double totalIncome = toDouble(overall[2]);

        YearMonth currentMonth = YearMonth.now();
        LocalDateTime thisMonthStart = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime nextMonthStart = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        LocalDateTime lastMonthStart = currentMonth.minusMonths(1).atDay(1).atStartOfDay();

        double thisMonthIncome = toDouble(orderRepo.findIncomeByUserIdAndDateRange(user.getId(), thisMonthStart, nextMonthStart));
        double lastMonthIncome = toDouble(orderRepo.findIncomeByUserIdAndDateRange(user.getId(), lastMonthStart, thisMonthStart));

        Map<Integer, OrderDashboardSummaryDto.DeliveryStatusSummaryDto> aggregatesByStatus = new HashMap<>();
        for (Object[] row : orderRepo.findStatusAggregatesByUserId(user.getId())) {
            Integer statusId = row[0] == null ? null : ((Number) row[0]).intValue();
            if (statusId == null) {
                continue;
            }

            aggregatesByStatus.put(statusId, OrderDashboardSummaryDto.DeliveryStatusSummaryDto.builder()
                    .deliveryStatusId(statusId)
                    .deliveryStatusName((String) row[1])
                    .orderCount(toLong(row[2]))
                    .totalOrderValue(toDouble(row[3]))
                    .totalIncome(toDouble(row[4]))
                    .build());
        }

        List<OrderDashboardSummaryDto.DeliveryStatusSummaryDto> statusSummaries = deliveryStatusRepo.findAll().stream()
                .sorted(Comparator.comparing(DeliveryStatus::getId))
                .map(status -> aggregatesByStatus.getOrDefault(
                        status.getId(),
                        OrderDashboardSummaryDto.DeliveryStatusSummaryDto.builder()
                                .deliveryStatusId(status.getId())
                                .deliveryStatusName(status.getName())
                                .orderCount(0L)
                                .totalOrderValue(0.0)
                                .totalIncome(0.0)
                                .build()
                ))
                .toList();

        return OrderDashboardSummaryDto.builder()
                .totalOrderCount(totalOrderCount)
                .totalOrderValue(totalOrderValue)
                .totalIncome(totalIncome)
                .thisMonthIncome(thisMonthIncome)
                .lastMonthIncome(lastMonthIncome)
                .statuses(statusSummaries)
                .build();
    }

    @Override
    public OrderRevenueTrendResponseDto getRevenueOrdersTrend(OrderRevenueTrendRequestDto dto) {
        Integer userId = dto.getUserId();
        if (userId == null || userId == 0) {
            throw new BusinessException("Validation failed", Map.of("userId", "Valid userId is required"));
        }
        userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", Map.of("userId", String.valueOf(userId))));

        LocalDate fromDate = dto.getFromDate();
        LocalDate toDate = dto.getToDate();
        if (fromDate == null || toDate == null) {
            throw new BusinessException("Validation failed", Map.of("dateRange", "fromDate and toDate are required"));
        }

        if (fromDate.isAfter(toDate)) {
            throw new BusinessException("Validation failed", Map.of("dateRange", "fromDate must be less than or equal to toDate"));
        }

        boolean includeOrderCount = !Boolean.FALSE.equals(dto.getIncludeOrderCount());
        boolean includeTotalPrice = Boolean.TRUE.equals(dto.getIncludeTotalPrice());
        boolean includeCollectivePrice = Boolean.TRUE.equals(dto.getIncludeCollectivePrice());
        boolean includeDeliveryFee = Boolean.TRUE.equals(dto.getIncludeDeliveryFee());
        boolean includeIncome = Boolean.TRUE.equals(dto.getIncludeIncome());

        if (!includeOrderCount && !includeTotalPrice && !includeCollectivePrice && !includeDeliveryFee && !includeIncome) {
            throw new BusinessException("Validation failed", Map.of("metrics", "At least one metric flag must be true"));
        }

        List<Integer> deliveryStatusIds = normalizeIntegerFilter(dto.getDeliveryStatusIds());
        List<Integer> paymentTypeIds = normalizeIntegerFilter(dto.getPaymentTypeIds());

        boolean applyDeliveryStatusFilter = !deliveryStatusIds.isEmpty();
        boolean applyPaymentTypeFilter = !paymentTypeIds.isEmpty();

        LocalDateTime fromDateTime = fromDate.atStartOfDay();
        LocalDateTime toExclusive = toDate.plusDays(1).atStartOfDay();

        List<Object[]> rows = orderRepo.findRevenueOrdersTrend(
                userId,
                fromDateTime,
                toExclusive,
                applyDeliveryStatusFilter,
                applyDeliveryStatusFilter ? deliveryStatusIds : List.of(-1),
                applyPaymentTypeFilter,
                applyPaymentTypeFilter ? paymentTypeIds : List.of(-1)
        );

        Map<LocalDate, Object[]> rowByDate = rows.stream()
                .collect(Collectors.toMap(row -> toLocalDate(row[0]), row -> row));

        List<OrderRevenueTrendResponseDto.TrendPointDto> points = new ArrayList<>();
        for (LocalDate date = fromDate; !date.isAfter(toDate); date = date.plusDays(1)) {
            Object[] row = rowByDate.get(date);
            long orderCount = row == null ? 0L : toLong(row[1]);
            double totalPrice = row == null ? 0.0 : toDouble(row[2]);
            double collectivePrice = row == null ? 0.0 : toDouble(row[3]);
            double deliveryFee = row == null ? 0.0 : toDouble(row[4]);
            double income = row == null ? 0.0 : toDouble(row[5]);

            points.add(OrderRevenueTrendResponseDto.TrendPointDto.builder()
                    .date(date)
                    .orderCount(includeOrderCount ? orderCount : null)
                    .totalPrice(includeTotalPrice ? totalPrice : null)
                    .collectivePrice(includeCollectivePrice ? collectivePrice : null)
                    .deliveryFee(includeDeliveryFee ? deliveryFee : null)
                    .income(includeIncome ? income : null)
                    .build());
        }

        return OrderRevenueTrendResponseDto.builder()
                .fromDate(fromDate)
                .toDate(toDate)
                .userId(userId)
                .points(points)
                .build();
    }

    @Override
    public DeliveringUserHistoryDto getDeliveringUsersHistory(DeliveringUserHistoryDto deliveringUserHistoryDto, Integer userId) {
        if (userId == null || userId == 0) {
            throw new BusinessException("Authenticated user id is required", null);
        }

        if (deliveringUserHistoryDto == null) {
            throw new BusinessException("Validation failed", Map.of("search", "Search, pageNumber and countPerPage are required"));
        }

        String search = deliveringUserHistoryDto.getSearch() == null ? null : deliveringUserHistoryDto.getSearch().trim();
        if (search == null || search.isEmpty()) {
            throw new BusinessException("Validation failed", Map.of("search", "Search is required"));
        }

        if (deliveringUserHistoryDto.getPageNumber() == null || deliveringUserHistoryDto.getPageNumber() < 0) {
            throw new BusinessException("Validation failed", Map.of("pageNumber", "Page number must be 0 or greater"));
        }

        if (deliveringUserHistoryDto.getCountPerPage() == null || deliveringUserHistoryDto.getCountPerPage() < 1) {
            throw new BusinessException("Validation failed", Map.of("countPerPage", "Count per page must be at least 1"));
        }

        // Get paginated delivery search results
        Pageable pageable = PageRequest.of(deliveringUserHistoryDto.getPageNumber(), deliveringUserHistoryDto.getCountPerPage(), Sort.by(Sort.Direction.DESC, "id"));
        Page<DeliveryTo> deliveryToPage = deliveryToRepo.findRelatedDeliveriesByUserAndSearch(userId, search, pageable);

        List<DeliveryToDto> relatedDeliveriesDetails = deliveryToPage.getContent().stream()
                .map(this::mapDeliveryToDto)
                .toList();

        // Calculate counts based on ALL user orders (not just search results)
        List<Order> allUserOrders = orderRepo.findByOrderCode_Users_Id(userId);
        int successfulDeliveries = 0;
        int failedDeliveries = 0;
        int pendingDeliveries = 0;

        for (Order order : allUserOrders) {
            if (order.getDeliveryStatus() == null || order.getDeliveryStatus().getId() == null) {
                pendingDeliveries++;
                continue;
            }

            Integer statusId = order.getDeliveryStatus().getId();
            if (statusId == 10 || statusId == 7) {
                successfulDeliveries++;
            } else if (statusId == 9) {
                failedDeliveries++;
            } else {
                pendingDeliveries++;
            }
        }

        // Build failed deliveries timeline from search results
        Map<String, List<SetDeliveryDto>> failedDeliveriesDeliveryTimeLine = new LinkedHashMap<>();
        for (DeliveryTo deliveryTo : deliveryToPage.getContent()) {
            Order order = deliveryTo.getOrder();
            if (order == null || order.getOrderCode() == null || order.getOrderCode().getCode() == null) {
                continue;
            }

            List<Delivery> deliveries = deliveryRepo.findAllByOrdersOrderByCreatedAtDesc(order);

            List<SetDeliveryDto> failedTimeline = deliveries.stream()
                    .filter(d -> d.getDeliveryStatus() != null && d.getDeliveryStatus().getId() == 9)
                    .map(this::mapDeliveryTimelineDto)
                    .toList();

            if (!failedTimeline.isEmpty()) {
                failedDeliveriesDeliveryTimeLine.put(order.getOrderCode().getCode(), failedTimeline);
            }
        }

        return DeliveringUserHistoryDto.builder()
                .search(search)
                .pageNumber(deliveringUserHistoryDto.getPageNumber())
                .countPerPage(deliveryToPage.getSize())
                .totalCount(deliveryToPage.getTotalElements())
                .totalPages(deliveryToPage.getTotalPages())
                .successfulDeliveries(successfulDeliveries)
                .failedDeliveries(failedDeliveries)
                .relatedDeliveriesDetails(relatedDeliveriesDetails)
                .failedDeliveriesDeliveryTimeLine(failedDeliveriesDeliveryTimeLine)
                .build();
    }

    @Override
    public String dropOrder(@Valid @NotNull @Min(0) Integer orderId, Integer userId) {
        Order order = orderRepo.findById(orderId).orElseThrow(() -> new BusinessException("Order not found", null));

        if ((order.getDeliveryTo().getUser().getId() != userId && order.getOrderCode().getUsers().getId() != userId) ) {
            throw new BusinessException("You are not the authorized to delete this order", null);
        }

        if (deliveryRepo.existsByOrders(order)) {
            throw new BusinessException("You are not the authorized to delete this order, the order is on the way", null);
        }

        if (complainRepo.existsByCode(order.getOrderCode().getCode())) {
            throw new BusinessException("You are not the authorized to delete this order, the order has a complain", null);
        }

        order.setIsDeleted(true);
        orderRepo.save(order);
        return "Order Deleted Successfully";
    }

    @Override
    public String updateDeliveryStatus(@NotNull @Min(0) Integer orderId, @NotNull @Min(0) Integer deliveryStatusId) {
        Order order = orderRepo.findById(orderId).orElseThrow(() -> new BusinessException("Order not found", null));

        order.setDeliveryStatus(deliveryStatusRepo.findById(deliveryStatusId).orElseThrow(() -> new BusinessException("DeliveryStatus not found", null)));
        orderRepo.save(order);
        return "Delivery Status Updated Successfully";
    }

    @Override
    public String userDeleteOrder(Integer orderId, int userId, boolean force) {
        Order order = orderRepo.findById(orderId).orElseThrow(() -> new BusinessException("Order not found", null));

        if ((order.getDeliveryTo().getUser().getId() != userId && order.getOrderCode().getUsers().getId() != userId) && !force) {
            throw new BusinessException("You are not the authorized to delete this order", null);
        }

        if (deliveryRepo.existsByOrders(order)) {
            throw new BusinessException("You are not the authorized to delete this order, the order is on the way", null);
        }

        if (complainRepo.existsByCode(order.getOrderCode().getCode())) {
            throw new BusinessException("You are not the authorized to delete this order, the order has a complain", null);
        }

        try {
            marketOrderRepo.findById(order.getMarketOrder() != null ? order.getMarketOrder().getId() : 0).ifPresent(marketOrder -> {
                marketOrderItemRepo.deleteAllByMarketOrder(marketOrder);
                marketOrderRepo.delete(marketOrder);
            });

            deliveryToRepo.delete(order.getDeliveryTo());

            orderRepo.delete(order);

        } catch (Exception e) {
//            throw new BusinessException("Order deletion failed", null);
            order.setIsDeleted(true);
            orderRepo.save(order);
        }

        return "Order Deleted Successfully";
    }

    private SetDeliveryDto mapDeliveryTimelineDto(Delivery delivery) {
        Order order = delivery.getOrders();
        String orderCode = order != null && order.getOrderCode() != null ? order.getOrderCode().getCode() : null;

        return SetDeliveryDto.builder()
                .id(delivery.getId())
                .note(delivery.getNote())
                .orderCode(orderCode)
                .deliveryStatusId(delivery.getDeliveryStatus() != null ? delivery.getDeliveryStatus().getId() : null)
                .build();
    }

    /**
     * Credit AgentWallet for COD collection when order is delivered by agent.
     * Only applies to COD orders (paymentType=1) with delivery status "Delivered By Agent" (id=7).
     * Uses order.collectivePrice as the COD amount (includes delivery fee).
     * Idempotent based on order code ref to prevent duplicate credits.
     */
    private void creditAgentWalletForCodCollection(Order order, Integer agentId) {
        String orderCode = order.getOrderCode() != null ? order.getOrderCode().getCode() : null;
        if (orderCode == null) {
            log.warn("Cannot credit AgentWallet for COD collection: order has no order code");
            return;
        }

        String idempotencyRef = "COD_COLLECTION:" + orderCode;

        // Check if this order has already been credited for COD collection
        if (agentWalletRepo.findByRef(idempotencyRef).isPresent()) {
            log.info("Order {} already credited for COD collection in AgentWallet, skipping", orderCode);
            return;
        }

        // Use collectivePrice as the COD amount (includes delivery fee)
        Double codAmount = order.getCollectivePrice() != null ? order.getCollectivePrice() : 0.0;

        if (codAmount <= 0) {
            log.warn("COD amount is zero or negative for order {}, skipping AgentWallet credit", orderCode);
            return;
        }

        WalletOperationDto walletOperation = WalletOperationDto.builder()
                .amount(codAmount)
                .isExpense(false) // Credit
                .paymentCategoryId(null)
                .paymentStatusId(2) // COMPLETED
                .code(orderCode)
                .ref(idempotencyRef)
                .toOrFrom(null)
                .note("COD collection for order: " + orderCode)
                .otherReason(null)
                .build();

        walletService.createAgentWalletOperation(agentId, walletOperation);
        log.info("Credited AgentWallet for agent {}, COD collection for order {}, amount: {}", agentId, orderCode, codAmount);
    }

    private boolean isFailedDelivery(Delivery delivery) {
        if (delivery == null || delivery.getDeliveryStatus() == null || delivery.getDeliveryStatus().getName() == null) {
            return false;
        }

        String status = delivery.getDeliveryStatus().getName().trim().toLowerCase(Locale.ROOT);
        return status.contains("fail") || status.contains("cancel") || status.contains("reject") || status.contains("return");
    }

    private boolean isSuccessfulDelivery(Delivery delivery) {
        if (delivery == null || delivery.getDeliveryStatus() == null || delivery.getDeliveryStatus().getName() == null) {
            return false;
        }

        String status = delivery.getDeliveryStatus().getName().trim().toLowerCase(Locale.ROOT);
        return status.contains("deliver") || status.contains("success") || status.contains("complete") || status.contains("done");
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private double toDouble(Object value) {
        return value == null ? 0.0 : ((Number) value).doubleValue();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }

        if (value instanceof java.sql.Date sqlDate) {
            return sqlDate.toLocalDate();
        }

        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toLocalDate();
        }

        return LocalDate.parse(String.valueOf(value));
    }

    private List<Integer> normalizeIntegerFilter(List<Integer> values) {
        if (values == null) {
            return Collections.emptyList();
        }

        return values.stream()
                .filter(Objects::nonNull)
                .filter(value -> value > 0)
                .distinct()
                .toList();
    }

    private DeliveryToDto mapDeliveryToDto(DeliveryTo deliveryTo) {
        if (deliveryTo == null) {
            return null;
        }

        DeliveryToDto dto = DeliveryToDto.builder()
                .id(deliveryTo.getId())
                .address(deliveryTo.getAddress())
                .primaryMobile(deliveryTo.getPrimaryMobile())
                .secondaryMobile(deliveryTo.getSecondaryMobile())
                .whatsapp(deliveryTo.getWhatsapp())
                .fullName(deliveryTo.getFullName())
                .location(deliveryTo.getLocation())
                .build();

        if (deliveryTo.getOrder() != null) {
            dto.setOrder(CommonIdNameDto.builder()
                    .id(deliveryTo.getOrder().getId())
                    .name(deliveryTo.getOrder().getOrderCode() == null ? null : deliveryTo.getOrder().getOrderCode().getCode())
                    .build());
        }

        if (deliveryTo.getCity() != null) {
            dto.setCity(modelMapper.map(deliveryTo.getCity(), CommonIdNameDto.class));
        }

        if (deliveryTo.getUser() != null) {
            dto.setUser(CommonIdNameDto.builder().id(deliveryTo.getUser().getId()).build());
        }

        return dto;
    }

    private ThirdPartySendersDto mapThirdPartySenderDto(ThirdPartySenders sender) {
        if (sender == null) {
            return null;
        }

        return new ThirdPartySendersDto(
                sender.getId(),
                sender.getName(),
                sender.getAddress(),
                sender.getNote(),
                sender.getNic(),
                sender.getFirst_mob(),
                sender.getSec_mob(),
                sender.getWhatsapp(),
                sender.getCreatedAt(),
                sender.getUpdatedAt(),
                sender.getCreatedBy(),
                sender.getUpdatedBy()
        );
    }

    private Order resolveOrderByIdOrCode(Integer orderId, String orderCode) {
        boolean hasOrderId = orderId != null && orderId != 0;
        boolean hasOrderCode = orderCode != null && !orderCode.trim().isEmpty();

        if (!hasOrderId && !hasOrderCode) {
            throw new BusinessException("Either order id or order code must be provided", null);
        }

        Order byId = null;
        Order byCode = null;

        if (hasOrderId) {
            byId = orderRepo.findById(orderId)
                    .orElseThrow(() -> new BusinessException("Order not found", Map.of("orderId", String.valueOf(orderId))));
        }

        if (hasOrderCode) {
            byCode = orderRepo.findByOrderCode_code(orderCode.trim())
                    .orElseThrow(() -> new BusinessException("Order not found", Map.of("orderCode", orderCode.trim())));
        }

        if (byId != null && byCode != null && !Objects.equals(byId.getId(), byCode.getId())) {
            throw new BusinessException("Provided order id and order code refer to different orders", null);
        }

        return byId != null ? byId : byCode;
    }

    private Double recalculateCollectivePrice(Order order, Double oldDeliveryFee) {
        Double previousCollectivePrice = order.getCollectivePrice() == null ? 0.0 : order.getCollectivePrice();
        Double previousDeliveryFeePart = Boolean.TRUE.equals(order.getDontCollectDeliveryFeeFromCustomer()) ? 0.0 : oldDeliveryFee;
        Double baseCollectiveAmount = previousCollectivePrice - previousDeliveryFeePart;
        Double currentDeliveryFeePart = Boolean.TRUE.equals(order.getDontCollectDeliveryFeeFromCustomer()) ? 0.0 : (order.getDeliveryFee() == null ? 0.0 : order.getDeliveryFee());
        return baseCollectiveAmount + currentDeliveryFeePart;
    }

    private void applyThirdPartySenderUpdate(Order order, ThirdPartySendersDto dto, Boolean removeThirdPartySender) {
        if (Boolean.TRUE.equals(removeThirdPartySender)) {
            order.setThirdPartySenders(null);
            return;
        }

        if (dto == null) {
            return;
        }

        if (dto.getId() != null && dto.getId() != 0) {
            ThirdPartySenders existingSender = thirdPartySendersRepo.findById(dto.getId())
                    .orElseThrow(() -> new BusinessException("Third party sender not found", null));

            if (dto.getName() != null) {
                existingSender.setName(dto.getName());
            }
            if (dto.getAddress() != null) {
                existingSender.setAddress(dto.getAddress());
            }
            if (dto.getNote() != null) {
                existingSender.setNote(dto.getNote());
            }
            if (dto.getNic() != null) {
                existingSender.setNic(dto.getNic());
            }
            if (dto.getFirst_mob() != null) {
                existingSender.setFirst_mob(dto.getFirst_mob());
            }
            if (dto.getSec_mob() != null) {
                existingSender.setSec_mob(dto.getSec_mob());
            }
            if (dto.getWhatsapp() != null) {
                existingSender.setWhatsapp(dto.getWhatsapp());
            }

            order.setThirdPartySenders(thirdPartySendersRepo.save(existingSender));
            return;
        }

        if (dto.getName() == null || dto.getName().isBlank() || dto.getFirst_mob() == null || dto.getFirst_mob().isBlank() ||
                dto.getSec_mob() == null || dto.getSec_mob().isBlank() || dto.getWhatsapp() == null || dto.getWhatsapp().isBlank()) {
            throw new BusinessException("Validation failed", Map.of(
                    "thirdPartySenders", "name, first_mob, sec_mob and whatsapp are required when creating a third party sender"
            ));
        }

        ThirdPartySenders savedSender = thirdPartySendersRepo.save(ThirdPartySenders.builder()
                .name(dto.getName())
                .address(dto.getAddress())
                .note(dto.getNote())
                .nic(dto.getNic())
                .first_mob(dto.getFirst_mob())
                .sec_mob(dto.getSec_mob())
                .whatsapp(dto.getWhatsapp())
                .build());

        order.setThirdPartySenders(savedSender);
    }

    private Double getDiscount(@NotNull @NotBlank String cuponCode) {
        return 0.0;
    }

    private OrderCodeRequestDto mapOrderCodeRequestDto(OrderCodeRequest request) {
        return OrderCodeRequestDto.builder()
                .id(request.getId())
                .qty(request.getQty())
                .printed(request.getPrinted())
                .printedBarcodesNeeded(request.getPrintedBarcodesNeeded())
                .user(OrderCodeRequestDto.RequestedUserDto.builder()
                        .id(request.getUser().getId())
                        .firstName(request.getUser().getFirstName())
                        .lastName(request.getUser().getLastName())
                        .email(request.getUser().getEmail())
                        .build())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    @Override
    public OrderHistoryDto getOrderHistoryByOrderCode(String orderCode) {
        Order order = orderRepo.findByOrderCode_code(orderCode).orElseThrow(() -> new BusinessException("Order not found", null));


        return null;
    }

    public record GetOrderHistoryDto(OrderDto order) {
    }


}
