package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.BranchDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import jakarta.validation.Valid;

public interface BranchService {
    String setBranch(BranchDto dto, int userId);

    ResponseDto<PaginatedBranchDto> getBranches(@Valid PaginatedBranchDto dto);
}
