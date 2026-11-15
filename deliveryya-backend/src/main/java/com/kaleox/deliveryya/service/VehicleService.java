package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.SetVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.UpdateVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.VehicleDto;
import jakarta.validation.Valid;

import java.util.List;

public interface VehicleService {

    ResponseDto<VehicleDto> setVehicle(@Valid SetVehicleDto dto);

    ResponseDto<VehicleDto> updateVehicle(@Valid UpdateVehicleDto dto);

    ResponseDto<PaginatedVehicleDto> getVehicles(@Valid PaginatedVehicleDto dto);

    ResponseDto<List<CommonIdNameDto>> getVehicleTypes(Integer id);
}

