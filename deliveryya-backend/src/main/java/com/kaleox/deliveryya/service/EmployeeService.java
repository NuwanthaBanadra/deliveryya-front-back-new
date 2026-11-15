package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.dto.user.SetEmployeeDto;
import com.kaleox.deliveryya.dto.user.UpdateEmployeeDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.dto.user.UserEmployeeDto;

public interface EmployeeService {

    UserDto getUserEmployeeId(Integer id);

    String updateCurrentLocation(String location, int userId);

    String setEmployee(SetEmployeeDto dto, int userId);

    String updateEmployee(UpdateEmployeeDto dto, int userId);

    UserEmployeeDto getEmployeeById(Integer id, Integer requesterUserId);

    DeliveryDto.EmployeeDto updateEmployeeLocation(int userId, String location);
}
