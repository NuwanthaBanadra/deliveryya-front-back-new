package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.BranchDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import com.kaleox.deliveryya.service.BranchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/branches")
public class BranchController {

    private final BranchService branchService;

    @PostMapping("/set-branch")
    public ResponseEntity<ResponseDto<Void>> setBranch(@Valid @RequestBody BranchDto dto,
                                                       @AuthenticationPrincipal UserDetails userDetails) {
        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(branchService.setBranch(dto, Integer.parseInt(userDetails.getUsername())))
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/get-branches")
    public ResponseEntity<ResponseDto<PaginatedBranchDto>> getBranches(@Valid @RequestBody PaginatedBranchDto dto) {
        return ResponseEntity.ok(branchService.getBranches(dto));
    }

    @GetMapping("/my-branches")
    public ResponseEntity<ResponseDto<List<BranchDto>>> getMyBranches(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ResponseDto.<List<BranchDto>>builder()
                .status(200)
                .message("Success")
                .desc("Employee branches fetched successfully")
                .object(branchService.getBranchesForEmployee(Integer.parseInt(userDetails.getUsername())))
                .build());
    }

    @GetMapping("/{branchId}/employees")
    public ResponseEntity<ResponseDto<?>> getEmployees(@PathVariable Integer branchId) {
        return ResponseEntity.ok(ResponseDto.builder()
                .status(200).message("Success")
                .desc("Branch employees fetched successfully")
                .object(branchService.getEmployees(branchId)).build());
    }

    @PostMapping("/{branchId}/employees/{employeeId}")
    public ResponseEntity<ResponseDto<Void>> assignEmployee(
            @PathVariable Integer branchId, @PathVariable Integer employeeId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200).message("Success")
                .desc(branchService.assignEmployee(branchId, employeeId)).build());
    }

    @PostMapping("/{branchId}/users/{userId}")
    public ResponseEntity<ResponseDto<Void>> assignUser(
            @PathVariable Integer branchId, @PathVariable Integer userId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200).message("Success")
                .desc(branchService.assignUser(branchId, userId)).build());
    }

    @DeleteMapping("/{branchId}/employees/{employeeId}")
    public ResponseEntity<ResponseDto<Void>> removeEmployee(
            @PathVariable Integer branchId, @PathVariable Integer employeeId) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200).message("Success")
                .desc(branchService.removeEmployee(branchId, employeeId)).build());
    }
}
