package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.SetVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.UpdateVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.VehicleDto;
import com.kaleox.deliveryya.entities.Vehicle;
import com.kaleox.deliveryya.entities.VehicleType;
import com.kaleox.deliveryya.repo.VehicleRepo;
import com.kaleox.deliveryya.repo.VehicleTypeRepo;
import com.kaleox.deliveryya.service.VehicleService;
import com.kaleox.deliveryya.service.specification.VehicleSpec;
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
public class VehicleServiceImpl implements VehicleService {

    private final VehicleRepo vehicleRepo;
    private final VehicleTypeRepo vehicleTypeRepo;

    @Override
    public ResponseDto<VehicleDto> setVehicle(SetVehicleDto dto) {
        if (vehicleRepo.existsByNumberIgnoreCase(dto.getNumber())) {
            throw new BusinessException("Vehicle number already exists: " + dto.getNumber(), null);
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(dto.getVehicleTypeId())
                .orElseThrow(() -> new BusinessException("Vehicle type not found with id: " + dto.getVehicleTypeId(), null));

        Vehicle savedVehicle = vehicleRepo.save(Vehicle.builder()
                .name(dto.getName())
                .number(dto.getNumber())
                .licenseExp(dto.getLicenseExp())
                .vehicleType(vehicleType)
                .build());

        return ResponseDto.<VehicleDto>builder()
                .message("Success")
                .desc("Vehicle created successfully.")
                .object(mapToVehicleDto(savedVehicle))
                .build();
    }

    @Override
    public ResponseDto<VehicleDto> updateVehicle(UpdateVehicleDto dto) {
        Vehicle vehicle = vehicleRepo.findById(dto.getId())
                .orElseThrow(() -> new BusinessException("Vehicle not found with id: " + dto.getId(), null));

        if (vehicleRepo.existsByNumberIgnoreCaseAndIdNot(dto.getNumber(), dto.getId())) {
            throw new BusinessException("Vehicle number already exists: " + dto.getNumber(), null);
        }

        VehicleType vehicleType = vehicleTypeRepo.findById(dto.getVehicleTypeId())
                .orElseThrow(() -> new BusinessException("Vehicle type not found with id: " + dto.getVehicleTypeId(), null));

        vehicle.setName(dto.getName());
        vehicle.setNumber(dto.getNumber());
        vehicle.setLicenseExp(dto.getLicenseExp());
        vehicle.setVehicleType(vehicleType);

        Vehicle savedVehicle = vehicleRepo.save(vehicle);

        return ResponseDto.<VehicleDto>builder()
                .message("Success")
                .desc("Vehicle updated successfully.")
                .object(mapToVehicleDto(savedVehicle))
                .build();
    }

    @Override
    public ResponseDto<PaginatedVehicleDto> getVehicles(PaginatedVehicleDto dto) {
        Pageable pageable = PageRequest.of(
                dto.getPageNumber(),
                dto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<Vehicle> spec = VehicleSpec.getVehicleSpecification(dto);
        Page<Vehicle> vehicles = vehicleRepo.findAll(spec, pageable);

        dto.setTotalCount(vehicles.getTotalElements());
        dto.setTotalPages(vehicles.getTotalPages());
        dto.setCountPerPage(vehicles.getSize());

        List<VehicleDto> vehicleDtos = vehicles.getContent().stream()
                .map(this::mapToVehicleDto)
                .toList();

        dto.setItems(vehicleDtos);

        return ResponseDto.<PaginatedVehicleDto>builder()
                .message("Success")
                .desc("Vehicles fetched successfully.")
                .object(dto)
                .build();
    }

    @Override
    public ResponseDto<List<CommonIdNameDto>> getVehicleTypes(Integer id) {
        List<CommonIdNameDto> typeDtos;

        if (id != null) {
            VehicleType vehicleType = vehicleTypeRepo.findById(id)
                    .orElseThrow(() -> new BusinessException("Vehicle type not found with id: " + id, null));

            typeDtos = List.of(new CommonIdNameDto(vehicleType.getId(), vehicleType.getName()));
        } else {
            typeDtos = vehicleTypeRepo.findAll().stream()
                    .map(type -> new CommonIdNameDto(type.getId(), type.getName()))
                    .toList();
        }

        return ResponseDto.<List<CommonIdNameDto>>builder()
                .status(200)
                .message("Success")
                .desc("Vehicle types fetched successfully.")
                .object(typeDtos)
                .build();
    }

    private VehicleDto mapToVehicleDto(Vehicle vehicle) {
        return VehicleDto.builder()
                .id(vehicle.getId())
                .name(vehicle.getName())
                .number(vehicle.getNumber())
                .licenseExp(vehicle.getLicenseExp())
                .vehicleType(CommonIdNameDto.builder()
                        .id(vehicle.getVehicleType().getId())
                        .name(vehicle.getVehicleType().getName())
                        .build())
                .build();
    }
}

