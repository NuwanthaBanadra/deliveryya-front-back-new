package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.WalletOperationDto;
import com.kaleox.deliveryya.dto.WalletRecordDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedWalletHistoryDto;
import com.kaleox.deliveryya.service.WalletService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/agent/{agentId}/balance")
    public ResponseEntity<ResponseDto<Double>> getAgentWalletBalance(
            @PathVariable @NotNull Integer agentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(agentId)) {
            return ResponseEntity.status(403).body(ResponseDto.<Double>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<Double>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet balance fetched successfully")
                .object(walletService.getAgentWalletCurrentBalance(agentId))
                .build());
    }

    @GetMapping("/client-market-owner/{userId}/balance")
    public ResponseEntity<ResponseDto<Double>> getClientMarketOwnerWalletBalance(
            @PathVariable @NotNull Integer userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.status(403).body(ResponseDto.<Double>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<Double>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet balance fetched successfully")
                .object(walletService.getClientMarketOwnerWalletCurrentBalance(userId))
                .build());
    }

    @GetMapping("/company/balance")
    public ResponseEntity<ResponseDto<Double>> getCompanyWalletBalance() {
        return ResponseEntity.ok(ResponseDto.<Double>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet balance fetched successfully")
                .object(walletService.getCompanyWalletCurrentBalance())
                .build());
    }

    @PostMapping("/agent/{agentId}/operation")
    public ResponseEntity<ResponseDto<WalletRecordDto>> createAgentWalletOperation(
            @PathVariable @NotNull Integer agentId,
            @Valid @RequestBody WalletOperationDto operation,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only create operations on their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(agentId)) {
            return ResponseEntity.status(403).body(ResponseDto.<WalletRecordDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only create operations on your own wallet")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet operation created successfully")
                .object(walletService.createAgentWalletOperation(agentId, operation))
                .build());
    }

    @PostMapping("/client-market-owner/{userId}/operation")
    public ResponseEntity<ResponseDto<WalletRecordDto>> createClientMarketOwnerWalletOperation(
            @PathVariable @NotNull Integer userId,
            @Valid @RequestBody WalletOperationDto operation,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only create operations on their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.status(403).body(ResponseDto.<WalletRecordDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only create operations on your own wallet")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet operation created successfully")
                .object(walletService.createClientMarketOwnerWalletOperation(userId, operation))
                .build());
    }

    @PostMapping("/company/operation")
    public ResponseEntity<ResponseDto<WalletRecordDto>> createCompanyWalletOperation(
            @Valid @RequestBody WalletOperationDto operation) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet operation created successfully")
                .object(walletService.createCompanyWalletOperation(operation))
                .build());
    }

    @GetMapping("/agent/{agentId}/history")
    public ResponseEntity<ResponseDto<List<WalletRecordDto>>> getAgentWalletHistory(
            @PathVariable @NotNull Integer agentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet, unless admin
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        Set<String> adminRoles = Set.of("ROLE_ADMIN", "ROLE_SUPPER ADMIN", "ROLE_OWNER", "ROLE_MANAGER", "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNT_ASSISTANT");
        if (!currentUserId.equals(agentId) && roles.stream().noneMatch(role -> adminRoles.contains(role))) {
            return ResponseEntity.status(403).body(ResponseDto.<List<WalletRecordDto>>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet history")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<List<WalletRecordDto>>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet history fetched successfully")
                .object(walletService.getAgentWalletHistory(agentId))
                .build());
    }

    @GetMapping("/client-market-owner/{userId}/history")
    public ResponseEntity<ResponseDto<List<WalletRecordDto>>> getClientMarketOwnerWalletHistory(
            @PathVariable @NotNull Integer userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet, unless admin
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        Set<String> adminRoles = Set.of("ROLE_ADMIN", "ROLE_SUPPER ADMIN", "ROLE_OWNER", "ROLE_MANAGER", "ROLE_ACCOUNTS_MANAGER", "ROLE_ACCOUNT_ASSISTANT");
        if (!currentUserId.equals(userId) && roles.stream().noneMatch(role -> adminRoles.contains(role))) {
            return ResponseEntity.status(403).body(ResponseDto.<List<WalletRecordDto>>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet history")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(ResponseDto.<List<WalletRecordDto>>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet history fetched successfully")
                .object(walletService.getClientMarketOwnerWalletHistory(userId))
                .build());
    }

    @GetMapping("/company/history")
    public ResponseEntity<ResponseDto<List<WalletRecordDto>>> getCompanyWalletHistory() {
        return ResponseEntity.ok(ResponseDto.<List<WalletRecordDto>>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet history fetched successfully")
                .object(walletService.getCompanyWalletHistory())
                .build());
    }

    @PostMapping("/agent/{agentId}/initialize")
    public ResponseEntity<ResponseDto<WalletRecordDto>> initializeAgentWallet(@PathVariable @NotNull Integer agentId) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet initialized successfully")
                .object(walletService.initializeAgentWallet(agentId))
                .build());
    }

    @PostMapping("/client-market-owner/{userId}/initialize")
    public ResponseEntity<ResponseDto<WalletRecordDto>> initializeClientMarketOwnerWallet(@PathVariable @NotNull Integer userId) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet initialized successfully")
                .object(walletService.initializeClientMarketOwnerWallet(userId))
                .build());
    }

    @PostMapping("/company/initialize")
    public ResponseEntity<ResponseDto<WalletRecordDto>> initializeCompanyWallet() {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet initialized successfully")
                .object(walletService.initializeCompanyWallet())
                .build());
    }

    @PostMapping("/agent/{agentId}/activate")
    public ResponseEntity<ResponseDto<WalletRecordDto>> activateAgentWallet(
            @PathVariable @NotNull Integer agentId,
            @RequestParam @NotNull Boolean isActive) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent wallet activation status updated successfully")
                .object(walletService.activateAgentWallet(agentId, isActive))
                .build());
    }

    @PostMapping("/client-market-owner/{userId}/activate")
    public ResponseEntity<ResponseDto<WalletRecordDto>> activateClientMarketOwnerWallet(
            @PathVariable @NotNull Integer userId,
            @RequestParam @NotNull Boolean isActive) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Client market owner wallet activation status updated successfully")
                .object(walletService.activateClientMarketOwnerWallet(userId, isActive))
                .build());
    }

    @PostMapping("/company/activate")
    public ResponseEntity<ResponseDto<WalletRecordDto>> activateCompanyWallet(@RequestParam @NotNull Boolean isActive) {
        return ResponseEntity.ok(ResponseDto.<WalletRecordDto>builder()
                .status(200)
                .message("Success")
                .desc("Company wallet activation status updated successfully")
                .object(walletService.activateCompanyWallet(isActive))
                .build());
    }

    @PostMapping("/agent/{agentId}/history/paginated")
    public ResponseEntity<ResponseDto<PaginatedWalletHistoryDto>> getAgentWalletHistoryPaginated(
            @PathVariable @NotNull Integer agentId,
            @Valid @RequestBody PaginatedWalletHistoryDto paginatedWalletHistoryDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(agentId)) {
            return ResponseEntity.status(403).body(ResponseDto.<PaginatedWalletHistoryDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet history")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(walletService.getAgentWalletHistoryPaginated(agentId, paginatedWalletHistoryDto));
    }

    @PostMapping("/client-market-owner/{userId}/history/paginated")
    public ResponseEntity<ResponseDto<PaginatedWalletHistoryDto>> getClientMarketOwnerWalletHistoryPaginated(
            @PathVariable @NotNull Integer userId,
            @Valid @RequestBody PaginatedWalletHistoryDto paginatedWalletHistoryDto,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.status(403).body(ResponseDto.<PaginatedWalletHistoryDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet history")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(walletService.getClientMarketOwnerWalletHistoryPaginated(userId, paginatedWalletHistoryDto));
    }

    @PostMapping("/company/history/paginated")
    public ResponseEntity<ResponseDto<PaginatedWalletHistoryDto>> getCompanyWalletHistoryPaginated(
            @Valid @RequestBody PaginatedWalletHistoryDto paginatedWalletHistoryDto) {
        return ResponseEntity.ok(walletService.getCompanyWalletHistoryPaginated(paginatedWalletHistoryDto));
    }

    @GetMapping("/agent/{agentId}/operation/{id}")
    public ResponseEntity<ResponseDto<WalletRecordDto>> getAgentWalletOperationDetail(
            @PathVariable @NotNull Integer agentId,
            @PathVariable @NotNull Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(agentId)) {
            return ResponseEntity.status(403).body(ResponseDto.<WalletRecordDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet operations")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(walletService.getAgentWalletOperationDetail(agentId, id));
    }

    @GetMapping("/client-market-owner/{userId}/operation/{id}")
    public ResponseEntity<ResponseDto<WalletRecordDto>> getClientMarketOwnerWalletOperationDetail(
            @PathVariable @NotNull Integer userId,
            @PathVariable @NotNull Integer id,
            @AuthenticationPrincipal UserDetails userDetails) {
        // Ownership validation: user can only access their own wallet
        Integer currentUserId = Integer.valueOf(userDetails.getUsername());
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.status(403).body(ResponseDto.<WalletRecordDto>builder()
                    .status(403)
                    .message("Error")
                    .desc("Access Denied - You can only access your own wallet operations")
                    .object(null)
                    .build());
        }
        return ResponseEntity.ok(walletService.getClientMarketOwnerWalletOperationDetail(userId, id));
    }

    @GetMapping("/company/operation/{id}")
    public ResponseEntity<ResponseDto<WalletRecordDto>> getCompanyWalletOperationDetail(
            @PathVariable @NotNull Integer id) {
        return ResponseEntity.ok(walletService.getCompanyWalletOperationDetail(id));
    }
}
