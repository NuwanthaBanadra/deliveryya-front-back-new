package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ComplainDto;
import com.kaleox.deliveryya.dto.ComplainStatusDto;
import com.kaleox.deliveryya.dto.ComplainTypeDto;
import com.kaleox.deliveryya.dto.OrderCodeDto;
import com.kaleox.deliveryya.dto.OrderDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedComplainDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.entities.Complain;
import com.kaleox.deliveryya.entities.ComplainStatus;
import com.kaleox.deliveryya.entities.ComplainType;
import com.kaleox.deliveryya.entities.Order;
import com.kaleox.deliveryya.repo.ComplainRepo;
import com.kaleox.deliveryya.repo.ComplainStatusRepo;
import com.kaleox.deliveryya.repo.ComplainTypeRepo;
import com.kaleox.deliveryya.repo.OrderRepo;
import com.kaleox.deliveryya.repo.UrgentJobRepo;
import com.kaleox.deliveryya.service.ComplainService;
import com.kaleox.deliveryya.service.specification.ComplainSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ComplainServiceImpl implements ComplainService {

    private static final String ORDER_CODE_PREFIX = "ORD";
    private static final String URGENT_JOB_CODE_PREFIX = "UJC";

    private final ComplainRepo complainRepo;
    private final ComplainTypeRepo complainTypeRepo;
    private final ComplainStatusRepo complainStatusRepo;
    private final OrderRepo orderRepo;
    private final UrgentJobRepo urgentJobRepo;
    private final ModelMapper modelMapper;

    @Override
    public ComplainDto setComplain(ComplainDto complainDto) {
        String complainCode = validateAndResolveComplainCode(complainDto.getCode());

        ComplainType complainType = complainTypeRepo.findById(complainDto.getComplainType().getId())
                .orElseThrow(() -> new BusinessException("Complain type not found", null));

        ComplainStatus pendingStatus = complainStatusRepo.findById(1)
                .orElseThrow(() -> new BusinessException("Default complain status not found", null));

        Complain complain = Complain.builder()
                .subject(complainDto.getSubject().trim())
                .complain(complainDto.getComplain().trim())
                .isSolve(false)
                .complainType(complainType)
                .complainStatus(pendingStatus)
                .code(complainCode)
                .build();

        Complain savedComplain = complainRepo.save(complain);

        return mapComplainToDto(savedComplain);
    }

    @Override
    public ComplainDto updateComplain(Integer userId, ComplainDto complainDto) {
        Map<String, String> errors = new HashMap<>();

        if (complainDto.getId() == null || complainDto.getId() == 0) {
            errors.put("id", "Complain ID is required");
            throw new BusinessException("Validation failed", errors);
        }

        Complain existingComplain = complainRepo.findById(complainDto.getId())
                .orElseThrow(() -> new BusinessException("Complain not found", null));

        if (!canManageComplain(userId, existingComplain)) {
            throw new BusinessException("Complain not found or you are not authorized to update this complain", null);
        }

        if (complainDto.getSubject() != null && !complainDto.getSubject().isBlank()) {
            existingComplain.setSubject(complainDto.getSubject().trim());
        }

        if (complainDto.getComplain() != null && !complainDto.getComplain().isBlank()) {
            existingComplain.setComplain(complainDto.getComplain().trim());
        }

        if (complainDto.getComplainType() != null && complainDto.getComplainType().getId() != null) {
            ComplainType complainType = complainTypeRepo.findById(complainDto.getComplainType().getId())
                    .orElseThrow(() -> new BusinessException("Complain type not found", null));
            existingComplain.setComplainType(complainType);
        }

        if (complainDto.getComplainStatus() != null && complainDto.getComplainStatus().getId() != null) {
            ComplainStatus complainStatus = complainStatusRepo.findById(complainDto.getComplainStatus().getId())
                    .orElseThrow(() -> new BusinessException("Complain status not found", null));
            existingComplain.setComplainStatus(complainStatus);
            existingComplain.setIsSolve(complainStatus.getId() == 3);
        }

        if (complainDto.getResponse() != null) {
            existingComplain.setResponse(complainDto.getResponse().trim());
        }

        Complain updatedComplain = complainRepo.save(existingComplain);

        return mapComplainToDto(updatedComplain);
    }

    @Override
    public String deleteComplain(Integer userId, Integer complainId) {
        if (complainId == null || complainId == 0) {
            throw new BusinessException("Validation failed", Map.of("id", "Complain ID is required"));
        }

        Complain complain = complainRepo.findById(complainId)
                .orElseThrow(() -> new BusinessException("Complain not found", null));

        if (!canManageComplain(userId, complain)) {
            throw new BusinessException("Complain not found or you are not authorized to delete this complain", null);
        }

        complainRepo.delete(complain);
        return "Complain deleted successfully";
    }

    @Override
    public PaginatedComplainDto getComplains(PaginatedComplainDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").descending());

        Specification<Complain> spec = ComplainSpec.getComplainSpecification(dto);

        Page<Complain> complains = complainRepo.findAll(spec, pageable);

        dto.setTotalCount(complains.getTotalElements());
        dto.setTotalPages(complains.getTotalPages());
        dto.setCountPerPage(complains.getSize());

        List<ComplainDto> complainDtoList = complains.getContent().stream().map(this::mapComplainToDto).toList();

        dto.setItems(complainDtoList);

        return dto;
    }

    @Override
    public List<ComplainTypeDto> getAllComplainTypes() {
        List<ComplainType> complainTypes = complainTypeRepo.findAll();
        return complainTypes.stream()
                .map(type -> modelMapper.map(type, ComplainTypeDto.class))
                .toList();
    }

    @Override
    public List<ComplainStatusDto> getAllComplainStatuses() {
        List<ComplainStatus> complainStatuses = complainStatusRepo.findAll();
        return complainStatuses.stream()
                .map(status -> modelMapper.map(status, ComplainStatusDto.class))
                .toList();
    }

    private boolean canManageComplain(Integer userId, Complain complain) {
        if (userId == null || complain == null) {
            return false;
        }

        String userIdValue = String.valueOf(userId);
        if (userIdValue.equals(normalizeAuditValue(complain.getCreatedBy()))) {
            return true;
        }

        String code = normalizeCode(complain.getCode());
        if (code == null) {
            return false;
        }

        if (code.startsWith(ORDER_CODE_PREFIX)) {
            return orderRepo.findByOrderCode_code(code)
                    .map(order -> order.getOrderCode() != null
                            && order.getOrderCode().getUsers() != null
                            && userId.equals(order.getOrderCode().getUsers().getId()))
                    .orElse(false);
        }

        if (code.startsWith(URGENT_JOB_CODE_PREFIX)) {
            return urgentJobRepo.findByJobCode(code)
                    .map(urgentJob -> userIdValue.equals(normalizeAuditValue(urgentJob.getCreatedBy())))
                    .orElse(false);
        }

        return false;
    }

    private String validateAndResolveComplainCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new BusinessException("Validation failed", Map.of("code", "Order code or urgent job code is required"));
        }

        String complainCode = normalizeCode(rawCode);

        if (complainCode.startsWith(ORDER_CODE_PREFIX)) {
            orderRepo.findByOrderCode_code(complainCode)
                    .orElseThrow(() -> new BusinessException("Order not found", Map.of("code", complainCode)));
            return complainCode;
        }

        if (complainCode.startsWith(URGENT_JOB_CODE_PREFIX)) {
            urgentJobRepo.findByJobCode(complainCode)
                    .orElseThrow(() -> new BusinessException("Urgent job not found", Map.of("code", complainCode)));
            return complainCode;
        }

        throw new BusinessException("Validation failed", Map.of("code", "Code must start with ORD or UJC"));
    }

    private ComplainDto mapComplainToDto(Complain complain) {
        ComplainDto dto = ComplainDto.builder()
                .id(complain.getId())
                .subject(complain.getSubject())
                .complain(complain.getComplain())
                .isSolve(complain.getIsSolve())
                .response(complain.getResponse())
                .code(normalizeCode(complain.getCode()))
                .complainType(CommonIdNameDto.builder()
                        .id(complain.getComplainType().getId())
                        .name(complain.getComplainType().getName())
                        .build())
                .complainStatus(CommonIdNameDto.builder()
                        .id(complain.getComplainStatus().getId())
                        .name(complain.getComplainStatus().getName())
                        .build())
                .build();

        if (dto.getCode() != null && dto.getCode().startsWith(ORDER_CODE_PREFIX)) {
            orderRepo.findByOrderCode_code(dto.getCode()).ifPresent(order -> {
                dto.setOrderId(order.getId());
                dto.setOrder(mapOrderToDto(order));
            });
        }

        return dto;
    }

    private OrderDto mapOrderToDto(Order order) {
        OrderDto orderDto = OrderDto.builder()
                .id(order.getId())
                .totalPrice(order.getTotalPrice())
                .collectivePrice(order.getCollectivePrice())
                .paidAmount(order.getPaidAmount())
                .build();

        if (order.getOrderCode() != null) {
            orderDto.setOrderCode(OrderCodeDto.builder()
                    .id(order.getOrderCode().getId())
                    .code(order.getOrderCode().getCode())
                    .users(order.getOrderCode().getUsers() == null ? null : UserDto.builder()
                            .id(order.getOrderCode().getUsers().getId())
                            .build())
                    .build());
        }

        return orderDto;
    }

    private String normalizeCode(String code) {
        if (code == null) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeAuditValue(String auditValue) {
        if (auditValue == null) {
            return null;
        }
        String trimmed = auditValue.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
