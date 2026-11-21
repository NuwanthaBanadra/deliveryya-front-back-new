package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.BranchDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import com.kaleox.deliveryya.dto.user.UserEmployeeDto;
import com.kaleox.deliveryya.entities.Branch;
import com.kaleox.deliveryya.entities.BranchHasEmployee;
import com.kaleox.deliveryya.entities.City;
import com.kaleox.deliveryya.entities.Employee;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.BranchService;
import com.kaleox.deliveryya.service.WalletService;
import com.kaleox.deliveryya.service.specification.BranchSpec;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
public class BranchServiceImpl implements BranchService {

    private final BranchRepo branchRepo;
    private final CityRepo cityRepo;
    private final UserRepo userRepo;
    private final EmployeeRepo employeeRepo;
    private final BranchHasEmployeeRepo branchHasEmployeeRepo;
    private final WalletService walletService;

    @Override
    public String setBranch(BranchDto dto, int userId) {
        userRepo.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", null));

        City city = cityRepo.findById(dto.getCity().getId())
                .orElseThrow(() -> new BusinessException("City not found", null));

        if (dto.getId() != null) {
            Branch existing = branchRepo.findById(dto.getId())
                    .orElseThrow(() -> new BusinessException("Branch not found", null));
            existing.setName(dto.getName());
            existing.setMainLine(dto.getMainLine());
            existing.setLocation(dto.getLocation());
            existing.setCity(city);
            branchRepo.save(existing);
            return "Branch updated successfully";
        }

        Branch branch = branchRepo.save(Branch.builder()
                .name(dto.getName())
                .mainLine(dto.getMainLine())
                .location(dto.getLocation())
                .city(city)
                .build());
        walletService.initializeBranchWallet(branch.getId());

        return "Branch created successfully";
    }

    @Override
    public ResponseDto<PaginatedBranchDto> getBranches(PaginatedBranchDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<Branch> spec = BranchSpec.getBranchSpecification(dto);

        Page<Branch> branches = branchRepo.findAll(spec, pageable);

        dto.setTotalCount(branches.getTotalElements());
        dto.setTotalPages(branches.getTotalPages());
        dto.setCountPerPage(branches.getSize());

        List<BranchDto> branchDtoList = branches.getContent().stream()
                .map(b -> new BranchDto(
                        b.getId(),
                        b.getName(),
                        b.getMainLine(),
                        b.getLocation(),
                        CommonIdNameDto.builder()
                                .id(b.getCity().getId())
                                .name(b.getCity().getName())
                                .build()
                ))
                .toList();

        dto.setItems(branchDtoList);

        return ResponseDto.<PaginatedBranchDto>builder()
                .message("Success")
                .desc("Branches fetched successfully.")
                .object(dto)
                .build();
    }

    @Override
    public List<BranchDto> getBranchesForEmployee(@NotNull Integer userId) {

        userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));
        employeeRepo.findByUsers_Id(userId).orElseThrow(() -> new BusinessException("Employee not found", null));

        return branchHasEmployeeRepo.findByEmployee_Users_Id(userId).stream()
                .map(BranchHasEmployee::getBranch)
                .map(this::toBranchDto)
                .toList();
    }

    @Override
    public List<UserEmployeeDto> getEmployees(Integer branchId) {
        branchRepo.findById(branchId).orElseThrow(() -> new BusinessException("Branch not found", null));
        return branchHasEmployeeRepo.findByBranch_Id(branchId).stream()
                .map(BranchHasEmployee::getEmployee)
                .map(this::toEmployeeDto)
                .toList();
    }

    @Override
    public String assignEmployee(Integer branchId, Integer employeeId) {
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new BusinessException("Branch not found", null));
        Employee employee = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new BusinessException("Employee not found", null));
        if (branchHasEmployeeRepo.findByBranch_IdAndEmployee_Id(branchId, employeeId).isEmpty()) {
            branchHasEmployeeRepo.save(BranchHasEmployee.builder().branch(branch).employee(employee).build());
        }
        return "Employee assigned to branch successfully";
    }

    @Override
    public String assignUser(Integer branchId, Integer userId) {
        Employee employee = employeeRepo.findByUsers_Id(userId)
                .orElseThrow(() -> new BusinessException("User is not an employee", null));
        return assignEmployee(branchId, employee.getId());
    }

    @Override
    public String removeEmployee(Integer branchId, Integer employeeId) {
        BranchHasEmployee assignment = branchHasEmployeeRepo.findByBranch_IdAndEmployee_Id(branchId, employeeId)
                .orElseThrow(() -> new BusinessException("Employee is not assigned to this branch", null));
        branchHasEmployeeRepo.delete(assignment);
        return "Employee removed from branch successfully";
    }

    private UserEmployeeDto toEmployeeDto(Employee employee) {
        return UserEmployeeDto.builder()
                .id(employee.getId())
                .usersId(employee.getUsers().getId())
                .usersFirstName(employee.getUsers().getFirstName())
                .usersLastName(employee.getUsers().getLastName())
                .usersEmail(employee.getUsers().getEmail())
                .location(employee.getLocation())
                .liveLocation(employee.getLiveLocation())
                .mobile(employee.getMobile())
                .whatsapp(employee.getWhatsapp())
                .build();
    }

    private BranchDto toBranchDto(Branch branch) {
        return new BranchDto(
                branch.getId(),
                branch.getName(),
                branch.getMainLine(),
                branch.getLocation(),
                CommonIdNameDto.builder()
                        .id(branch.getCity().getId())
                        .name(branch.getCity().getName())
                        .build());
    }
}
