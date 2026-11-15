package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.SetVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.UpdateVehicleDto;
import com.kaleox.deliveryya.dto.vehicle.VehicleDto;
import com.kaleox.deliveryya.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping("/set-vehicle")
    public ResponseEntity<ResponseDto<VehicleDto>> setVehicle(@Valid @RequestBody SetVehicleDto dto) {
        return ResponseEntity.ok(vehicleService.setVehicle(dto));
    }

    @PostMapping("/update-vehicle")
    public ResponseEntity<ResponseDto<VehicleDto>> updateVehicle(@Valid @RequestBody UpdateVehicleDto dto) {
        return ResponseEntity.ok(vehicleService.updateVehicle(dto));
    }

    @PostMapping("/get-vehicles")
    public ResponseEntity<ResponseDto<PaginatedVehicleDto>> getVehicles(@Valid @RequestBody PaginatedVehicleDto dto) {
        return ResponseEntity.ok(vehicleService.getVehicles(dto));
    }

    @GetMapping("/get-vehicle-types")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getVehicleTypes(@RequestParam(required = false) Integer id) {
        return ResponseEntity.ok(vehicleService.getVehicleTypes(id));
    }
}

