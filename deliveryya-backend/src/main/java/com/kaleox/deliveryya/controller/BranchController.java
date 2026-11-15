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
}
