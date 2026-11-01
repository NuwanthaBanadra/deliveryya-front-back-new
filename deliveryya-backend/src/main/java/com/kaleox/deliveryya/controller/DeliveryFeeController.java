package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.DeliveryFeeDto;
import com.kaleox.deliveryya.dto.DeliveryFeeUpsertDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedDeliveryFeesDto;
import com.kaleox.deliveryya.service.PaymentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/delivery-fees")
public class DeliveryFeeController {

    private final PaymentService paymentService;

    @GetMapping("/get-delivery-fee-by-city-id")
    public ResponseEntity<ResponseDto<DeliveryFeeDto>> getDeliveryFeeByCityId(@RequestParam Integer id) {
        return ResponseEntity.ok(
                ResponseDto.<DeliveryFeeDto>builder()
                        .message("Success")
                        .desc("Delivery Fee Retrieved Successfully")
                        .object(paymentService.getDeliveryFeeByCityId(id))
                        .build()
        );
    }

    @GetMapping("/get-delivery-cost-by-city-id")
    public ResponseEntity<ResponseDto<Double>> getDeliveryCostByCityId(@RequestParam @NotNull Integer id, @RequestParam(required = false) Double weight) {
        return ResponseEntity.ok(
                ResponseDto.<Double>builder()
                        .message("Success")
                        .desc("Delivery Cost Retrieved Successfully")
                        .object(paymentService.getDeliveryCostByCityId(id, weight == null || weight == 0 ? 1.0 : weight))
                        .build()
        );
    }

    @PostMapping("/get-delivery-fees")
    public ResponseEntity<ResponseDto<PaginatedDeliveryFeesDto>> getDeliveryFees(@Valid @RequestBody PaginatedDeliveryFeesDto paginatedDeliveryFeesDto) {
        return ResponseEntity.ok(paymentService.getDeliveryFees(paginatedDeliveryFeesDto));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
            "hasRole('ADMIN') or " +
            "hasRole('OWNER') or " +
            "hasRole('MANAGER') or " +
            "hasRole('SECRETORY') or " +
            "hasRole('ACCOUNTS_MANAGER') or " +
            "hasRole('ACCOUNT_ASSISTANT') or " +
            "hasRole('MARKETS_MANAGER')"
    )
    @PostMapping("/upsert-delivery-fee")
    public ResponseEntity<ResponseDto<DeliveryFeeDto>> upsertDeliveryFee(@Valid @RequestBody DeliveryFeeUpsertDto deliveryFeeUpsertDto) {
        return ResponseEntity.ok(paymentService.upsertDeliveryFee(deliveryFeeUpsertDto));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
            "hasRole('ADMIN') or " +
            "hasRole('OWNER') or " +
            "hasRole('MANAGER') or " +
            "hasRole('SECRETORY') or " +
            "hasRole('ACCOUNTS_MANAGER') or " +
            "hasRole('ACCOUNT_ASSISTANT') or " +
            "hasRole('MARKETS_MANAGER')"
    )
    @DeleteMapping("/delete-delivery-fee")
    public ResponseEntity<ResponseDto<Void>> deleteDeliveryFee(@RequestParam @NotNull Integer id) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(paymentService.deleteDeliveryFee(id))
                .build());
    }
}

