package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDiscountDto;
import com.kaleox.deliveryya.service.DiscountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Discount Management
 * Base URL: /api/v1/discounts
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/discounts")
public class DiscountController {

    private final DiscountService discountService;

    @PostMapping("/create")
    public ResponseEntity<ResponseDto<Void>> createDiscounts(@Valid @RequestBody CreateDiscountDto dto) {
        return ResponseEntity.ok(discountService.createDiscounts(dto));
    }

    @PostMapping("/get-by-user")
    public ResponseEntity<ResponseDto<List<DiscountDto>>> getDiscountsByUserId(@Valid @RequestBody GetDiscountsByUserDto dto) {
        return ResponseEntity.ok(discountService.getDiscountsByUserId(dto.getUserId()));
    }

    @PostMapping("/delete")
    public ResponseEntity<ResponseDto<Void>> deleteDiscount(@Valid @RequestBody DeleteDiscountDto dto) {
        return ResponseEntity.ok(discountService.deleteDiscount(dto.getUserId(), dto.getCityId()));
    }

    @PostMapping("/update")
    public ResponseEntity<ResponseDto<Void>> updateDiscount(@Valid @RequestBody UpdateDiscountDto dto) {
        return ResponseEntity.ok(discountService.updateDiscount(dto.getUserId(), dto.getCityId(), dto.getDiscount()));
    }

    @PostMapping("/get-users-with-discounts")
    public ResponseEntity<ResponseDto<PaginatedDiscountDto>> getUsersWithDiscounts(@Valid @RequestBody PaginatedDiscountDto paginatedDiscountDto) {
        return ResponseEntity.ok(discountService.getUsersWithDiscounts(paginatedDiscountDto));
    }
}
