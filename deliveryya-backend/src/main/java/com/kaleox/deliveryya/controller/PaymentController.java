package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedPaymentRecodeDto;
import com.kaleox.deliveryya.service.PaymentService;
import com.kaleox.deliveryya.config.BusinessException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/payment")
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/get-payment-types")
    public ResponseEntity<ResponseDto<List<PaymentTypeDto>>> getAllPaymentTypes() {
        return ResponseEntity.ok(paymentService.getAllPaymentTypes());
    }

    @GetMapping("/get-payment-statuses")
    public ResponseEntity<ResponseDto<List<PaymentStatusDto>>> getAllPaymentStatuses(@RequestParam(required = false) Integer id) {
        return ResponseEntity.ok(paymentService.getAllPaymentStatuses(id));
    }

    @GetMapping("/get-payment-categories")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getAllPaymentCategories() {
        return ResponseEntity.ok(paymentService.getAllPaymentCategories());
    }

    @PostMapping("/notify-payment-done")
    public ResponseEntity<ResponseDto<Void>> notifyPaymentDone(@RequestParam @NotNull String orderCodes) {

        return ResponseEntity.ok(
                ResponseDto.<Void>builder()
                        .message("Success")
                        .desc(paymentService.notifyPaymentDone(orderCodes))
                        .object(null)
                        .build()
        );
    }

    //    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
//            "hasRole('ADMIN') or " +
//            "hasRole('OWNER') or " +
//            "hasRole('MANAGER') or " +
//            "hasRole('CLIENT') or " +
//            "hasRole('MARKET_OWNER') or " +
//            "hasRole('SECRETORY') or " +
//            "hasRole('ACCOUNTS_MANAGER') or " +
//            "hasRole('ACCOUNT_ASSISTANT') or " +
//            "hasRole('MARKETS_MANAGER')"
//    )
    @PostMapping("/create-payment-record")
    public ResponseEntity<ResponseDto<Integer>> createPaymentRecode(@Valid @RequestBody PaymentRecordDto paymentRecordDto, @AuthenticationPrincipal UserDetails userDetails) {

//        Set<String> roles = userDetails.getAuthorities().stream()
//                .map(GrantedAuthority::getAuthority)
//                .collect(Collectors.toSet());
//
//        Set<String> allowedRoles = Set.of(
//                "ROLE_SUPER_ADMIN", "ROLE_ADMIN", "ROLE_OWNER", "ROLE_MANAGER", "ROLE_SECRETORY",
//                "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNT_ASSISTANT", "ROLE_MARKETS_MANAGER"
//        );
//
//        if (roles.stream().noneMatch(allowedRoles::contains)) {
//            paymentRecordDto.setPaymentType(CommonIdNameDto.builder().id(2).build());
//
//            paymentRecordDto.setIsReturn(false);
//        }

        return ResponseEntity.ok(ResponseDto.<Integer>builder()
                .message("Success")
                .desc("Payment record created successfully")
                .object(paymentService.createPaymentRecode(paymentRecordDto))
                .build());
    }

    @PostMapping("/validate-payment-reference")
    public ResponseEntity<ResponseDto<PaymentReferenceValidationDto>> validatePaymentReference(
            @Valid @RequestBody PaymentReferenceValidationRequestDto dto) {
        return ResponseEntity.ok(paymentService.validatePaymentReference(dto));
    }

    @PostMapping("/create-payment-record-for-agent-onhand-orders")
    public ResponseEntity<ResponseDto<Integer>> createPaymentRecodeForAgentOnHandOrders(@Valid @RequestBody PaymentRecordDto paymentRecordDto, @AuthenticationPrincipal UserDetails userDetails) {
        if (paymentRecordDto.getBranchId() == null || paymentRecordDto.getBranchId() <= 0) {
            throw new BusinessException("A valid branch ID is required for agent on-hand payment records.", null);
        }
        return ResponseEntity.ok(ResponseDto.<Integer>builder()
                .message("Success")
                .desc("Payment record created successfully")
                .object(paymentService.createPaymentRecode(paymentRecordDto))
                .build());
    }

//    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
//            "hasRole('ADMIN') or " +
//            "hasRole('OWNER') or " +
//            "hasRole('MANAGER') or " +
//            "hasRole('CLIENT') or " +
//            "hasRole('MARKET_OWNER') or " +
//            "hasRole('SECRETORY') or " +
//            "hasRole('ACCOUNTS_MANAGER') or " +
//            "hasRole('ACCOUNT_ASSISTANT') or " +
//            "hasRole('MARKETS_MANAGER')"
//    )

    @RequestMapping(value = "/update-payment-record", method = {RequestMethod.POST, RequestMethod.PUT})
    public ResponseEntity<ResponseDto<PaymentRecordDto>> updatePaymentRecode(@Valid @RequestBody PaymentRecordDto paymentRecordDto) {

        return ResponseEntity.ok(ResponseDto.<PaymentRecordDto>builder()
                .message("Success")
                .desc(paymentService.updatePaymentRecode(paymentRecordDto))
                .build());
    }

    //    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
//            "hasRole('ADMIN') or " +
//            "hasRole('OWNER') or " +
//            "hasRole('MANAGER') or " +
//            "hasRole('SECRETORY') or " +
//            "hasRole('ACCOUNTS_MANAGER') or " +
//            "hasRole('ACCOUNT_ASSISTANT') or " +
//            "hasRole('MARKETS_MANAGER')"
//    )
    @PostMapping("/update-payment-verification-status-or-delete")
    public ResponseEntity<ResponseDto<Void>> updatePaymentVerificationStatusOrDelete(@Valid @RequestBody UpdatePaymentVerificationStatusOrDeleteDto dto) {

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(paymentService.updatePaymentVerificationStatusOrDelete(dto))
                .build());
    }

    //    @PreAuthorize("hasRole('SUPER_ADMIN') or " +
//            "hasRole('ADMIN') or " +
//            "hasRole('OWNER') or " +
//            "hasRole('MANAGER') or " +
//            "hasRole('CLIENT') or " +
//            "hasRole('MARKET_OWNER') or " +
//            "hasRole('SECRETORY') or " +
//            "hasRole('ACCOUNTS_MANAGER') or " +
//            "hasRole('ACCOUNT_ASSISTANT') or " +
//            "hasRole('MARKETS_MANAGER')"
//    )
    @PostMapping("/get-payment-records")
    public ResponseEntity<ResponseDto<PaginatedPaymentRecodeDto>> getPaymentRecodes(@Valid @RequestBody PaginatedPaymentRecodeDto paginatedPaymentRecodeDto, @AuthenticationPrincipal UserDetails userDetails) {

//        Set<String> roles = userDetails.getAuthorities().stream()
//                .map(GrantedAuthority::getAuthority)
//                .collect(Collectors.toSet());
//
//        if (roles.contains("ROLE_CLIENT") || roles.contains("ROLE_MARKET_OWNER")) {
//            paginatedPaymentRecodeDto.setClientId(Integer.valueOf(userDetails.getUsername()));
//        }

        return ResponseEntity.ok(paymentService.getPaymentRecodes(paginatedPaymentRecodeDto));
    }
}
