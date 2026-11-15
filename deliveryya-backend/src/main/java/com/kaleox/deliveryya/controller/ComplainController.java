package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ComplainDto;
import com.kaleox.deliveryya.dto.ComplainStatusDto;
import com.kaleox.deliveryya.dto.ComplainTypeDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CreateGroup;
import com.kaleox.deliveryya.dto.customDto.UpdateGroup;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedComplainDto;
import com.kaleox.deliveryya.service.ComplainService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/complains")
public class ComplainController {

    private final ComplainService complainService;

    @PostMapping("/set-complain")
    public ResponseEntity<ResponseDto<ComplainDto>> setComplain(
            @RequestBody @Validated(CreateGroup.class) ComplainDto complainDto) {

        Map<String, String> errors = new HashMap<>();

        // Validate required fields
        if (complainDto.getComplainType() == null || complainDto.getComplainType().getId() == null || complainDto.getComplainType().getId() == 0) {
            errors.put("complainType", "Complain type is required");
        }

        if (complainDto.getCode() == null || complainDto.getCode().isBlank()) {
            errors.put("code", "Order code or urgent job code is required");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Validation failed", errors);
        }

        ComplainDto result = complainService.setComplain(complainDto);

        return ResponseEntity.ok(ResponseDto.<ComplainDto>builder()
                .status(200)
                .message("success")
                .desc("Complain created successfully")
                .object(result)
                .build());
    }

    @PutMapping("/update-complain")
    public ResponseEntity<ResponseDto<ComplainDto>> updateComplain(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Validated(UpdateGroup.class) ComplainDto complainDto) {

        Map<String, String> errors = new HashMap<>();

        // Validate ID is provided
        if (complainDto.getId() == null || complainDto.getId() == 0) {
            errors.put("id", "Complain ID is required");
        }

        if (!errors.isEmpty()) {
            throw new BusinessException("Validation failed", errors);
        }

        ComplainDto result = complainService.updateComplain(requireAuthenticatedUserId(userDetails), complainDto);

        return ResponseEntity.ok(ResponseDto.<ComplainDto>builder()
                .status(200)
                .message("success")
                .desc("Complain updated successfully")
                .object(result)
                .build());
    }

    @DeleteMapping("/delete-complain-by-id")
    public ResponseEntity<ResponseDto<Void>> deleteComplainById(
            @RequestParam @NotNull(message = "Complain ID must be provided") @Min(value = 1, message = "Complain ID must be greater than 0") Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200)
                .message("success")
                .desc(complainService.deleteComplain(requireAuthenticatedUserId(userDetails), id))
                .build());
    }

    @PostMapping("/get-complains")
    public ResponseEntity<ResponseDto<PaginatedComplainDto>> getComplains(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody @Valid PaginatedComplainDto dto) {

//        Integer authenticatedUserId = resolveAuthenticatedUserId(userDetails);
//        boolean hasUserIdFilter = dto.getUserId() != null && dto.getUserId() != 0;
//        boolean hasPlacedUserIdFilter = dto.getPlacedUserId() != null && dto.getPlacedUserId() != 0;
//
//        if (!hasUserIdFilter && !hasPlacedUserIdFilter && authenticatedUserId != null) {
//            dto.setPlacedUserId(authenticatedUserId);
//        }

        PaginatedComplainDto result = complainService.getComplains(dto);

        return ResponseEntity.ok(ResponseDto.<PaginatedComplainDto>builder()
                .status(200)
                .message("success")
                .desc("Complains retrieved successfully")
                .object(result)
                .build());
    }

    private Integer requireAuthenticatedUserId(UserDetails userDetails) {
        Integer userId = resolveAuthenticatedUserId(userDetails);
        if (userId == null) {
            throw new BusinessException("Authentication required", Map.of("user", "Authenticated user is required"));
        }
        return userId;
    }

    private Integer resolveAuthenticatedUserId(UserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) {
            return null;
        }

        String username = userDetails.getUsername().trim();
        if (username.isEmpty() || "anonymousUser".equals(username) || !username.matches("\\d+")) {
            return null;
        }

        return Integer.parseInt(username);
    }

    @GetMapping("/get-complain-types")
    public ResponseEntity<ResponseDto<List<ComplainTypeDto>>> getAllComplainTypes() {
        List<ComplainTypeDto> complainTypes = complainService.getAllComplainTypes();

        return ResponseEntity.ok(ResponseDto.<List<ComplainTypeDto>>builder()
                .status(200)
                .message("success")
                .desc("Complain types retrieved successfully")
                .object(complainTypes)
                .build());
    }

    @GetMapping("/get-complain-statuses")
    public ResponseEntity<ResponseDto<List<ComplainStatusDto>>> getAllComplainStatuses() {
        List<ComplainStatusDto> complainStatuses = complainService.getAllComplainStatuses();

        return ResponseEntity.ok(ResponseDto.<List<ComplainStatusDto>>builder()
                .status(200)
                .message("success")
                .desc("Complain statuses retrieved successfully")
                .object(complainStatuses)
                .build());
    }
}

