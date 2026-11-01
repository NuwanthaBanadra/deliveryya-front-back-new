package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.BranchDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import com.kaleox.deliveryya.entities.Branch;
import com.kaleox.deliveryya.entities.City;
import com.kaleox.deliveryya.repo.BranchRepo;
import com.kaleox.deliveryya.repo.CityRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.BranchService;
import com.kaleox.deliveryya.service.specification.BranchSpec;
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
            existing.setLocation(dto.getLocation());
            existing.setCity(city);
            branchRepo.save(existing);
            return "Branch updated successfully";
        }

        branchRepo.save(Branch.builder()
                .name(dto.getName())
                .location(dto.getLocation())
                .city(city)
                .build());

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
}
