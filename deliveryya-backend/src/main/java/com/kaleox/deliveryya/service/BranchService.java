package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.BranchDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import com.kaleox.deliveryya.dto.user.UserEmployeeDto;
import jakarta.validation.Valid;

import java.util.List;

public interface BranchService {
    String setBranch(BranchDto dto, int userId);

    ResponseDto<PaginatedBranchDto> getBranches(@Valid PaginatedBranchDto dto);

    List<BranchDto> getBranchesForEmployee(Integer userId);

    List<UserEmployeeDto> getEmployees(Integer branchId);

    String assignEmployee(Integer branchId, Integer employeeId);

    String assignUser(Integer branchId, Integer userId);

    String removeEmployee(Integer branchId, Integer employeeId);
}
