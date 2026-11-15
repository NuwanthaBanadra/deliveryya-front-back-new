package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.user.SetEmployeeDto;
import com.kaleox.deliveryya.dto.user.UpdateEmployeeDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.dto.user.UserEmployeeDto;
import com.kaleox.deliveryya.service.EmployeeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    @PostMapping("/update-current-location")
    public ResponseEntity<ResponseDto<Void>> updateCurrentLocation(@Valid @RequestBody Map<String, String> data, @AuthenticationPrincipal UserDetails userDetails) {

        int userId = data.get("userId") != null ? Integer.parseInt(data.get("userId")) : Integer.parseInt(userDetails.getUsername());

        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(employeeService.updateCurrentLocation(data.get("location"), userId))
                .build();

        return ResponseEntity.ok(response);
    }


    @GetMapping("/get-user-by-employee-id")
    public ResponseEntity<ResponseDto<UserDto>> getUserEmployeeId(@RequestParam @Valid @NotNull Integer id) {

        return ResponseEntity.ok(ResponseDto.<UserDto>builder()
                .status(200)
                .message("Success")
                .desc("Employee ID fetched successfully")
                .object(employeeService.getUserEmployeeId(id))
                .build());
    }

    @GetMapping("/get-details-by-id")
    public ResponseEntity<ResponseDto<UserEmployeeDto>> getSetEmployeeId(@RequestParam @Valid @NotNull Integer id, @AuthenticationPrincipal UserDetails userDetails) {
        Integer requesterUserId = null;

        if (userDetails != null && !"anonymousUser".equals(userDetails.getUsername())) {
            requesterUserId = Integer.parseInt(userDetails.getUsername());
        }

        return ResponseEntity.ok(ResponseDto.<UserEmployeeDto>builder()
                .status(200)
                .message("Success")
                .desc("Employee details fetched successfully")
                .object(employeeService.getEmployeeById(id, requesterUserId))
                .build());
    }

    @PostMapping("/set-employee")
    public ResponseEntity<ResponseDto<Void>> setEmployee(@Valid @RequestBody SetEmployeeDto dto, @AuthenticationPrincipal UserDetails userDetails) {

        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(employeeService.setEmployee(dto, Integer.parseInt(userDetails.getUsername())))
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-employee")
    public ResponseEntity<ResponseDto<Void>> updateEmployee(@Valid @RequestBody UpdateEmployeeDto dto, @AuthenticationPrincipal UserDetails userDetails) {

        ResponseDto<Void> response = ResponseDto.<Void>builder()
                .message("Success")
                .desc(employeeService.updateEmployee(dto, Integer.parseInt(userDetails.getUsername())))
                .build();

        return ResponseEntity.ok(response);
    }

}
