package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.delivery.DeliveryDto;
import com.kaleox.deliveryya.dto.user.SetEmployeeDto;
import com.kaleox.deliveryya.dto.user.UpdateEmployeeDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.dto.user.UserEmployeeDto;
import com.kaleox.deliveryya.entities.Employee;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.entities.UserRole;
import com.kaleox.deliveryya.entities.VerificationStatus;
import com.kaleox.deliveryya.repo.BranchRepo;
import com.kaleox.deliveryya.repo.EmployeeRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {
    private final UserRepo userRepo;
    private final ModelMapper modelMapper;
    private final EmployeeRepo employeeRepo;
    private final BranchRepo branchRepo;

    @Override
    public UserDto getUserEmployeeId(Integer id) {
        return employeeRepo.findById(id)
                .map(employee -> {
                    User user = employee.getUsers();
                    UserDto userDto = modelMapper.map(user, UserDto.class);
                    userDto.setPassword(null);

                    return userDto;
                })
                .orElseThrow(() -> new BusinessException("Employee not found with id: " + id, null));
    }

    @Override
    public String updateCurrentLocation(String location, int userId) {

        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));
        if (!user.getIsEmployee()) {
            throw new BusinessException("User is not an employee", null);
        }

        employeeRepo.findByUsers(user).ifPresentOrElse(employee -> {
            employee.setLocation(location);
            employeeRepo.save(employee);
        }, () -> {
            throw new BusinessException("Employee record not found for user", null);
        });

        return "Location updated successfully";
    }

    @Override
    public String setEmployee(SetEmployeeDto dto, int userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        if (user.getUserRole().getId() < dto.getUserRoles().getId()) {
            throw new BusinessException("You don't have permission to promote this user", null);
        }

        User promotingUser = userRepo.findById(dto.getUsers().getId()).orElseThrow(() -> new BusinessException("User to promote not found", null));
        employeeRepo.findByUsers(promotingUser).ifPresent(e -> {
            throw new BusinessException("User is already an employee", null);
        });

        promotingUser.setIsEmployee(true);
        promotingUser.setUserRole(UserRole.builder().id(dto.getUserRoles().getId()).build());
        userRepo.save(promotingUser);

        employeeRepo.save(Employee.builder()
                .verificationStatus(VerificationStatus.builder().id(dto.getVerificationStatus().getId()).build())
                .branches(branchRepo.findById(dto.getBranches().getId()).orElseThrow(() -> new BusinessException("Branch not found", null)))
                .users(promotingUser)
                .location(dto.getLocation())
                .mobile(dto.getMobile())
                .whatsapp(dto.getWhatsapp())
                .liveLocation(dto.getLiveLocation())
                .build());

        return "Employee registered successfully";
    }

    @Override
    public String updateEmployee(UpdateEmployeeDto dto, int userId) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        Employee employee = employeeRepo.findById(dto.getId())
                .orElseThrow(() -> new BusinessException("Employee not found", null));

        // Check if the user has permission to update this employee
        if (user.getUserRole().getId() > employee.getUsers().getUserRole().getId()) {
            throw new BusinessException("You don't have permission to update this employee", null);
        }

        // Update employee details
        employee.setLocation(dto.getLocation());
        employee.setLiveLocation(dto.getLiveLocation());
        employee.setMobile(dto.getMobile());
        employee.setWhatsapp(dto.getWhatsapp());
        employee.setVerificationStatus(VerificationStatus.builder().id(dto.getVerificationStatus().getId()).build());
        employee.setBranches(branchRepo.findById(dto.getBranches().getId())
                .orElseThrow(() -> new BusinessException("Branch not found", null)));

        employeeRepo.save(employee);

        return "Employee updated successfully";
    }

    @Override
    public UserEmployeeDto getEmployeeById(Integer id, Integer requesterUserId) {
        Employee employee = employeeRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Employee not found with id: " + id, null));

        return modelMapper.map(employee, UserEmployeeDto.class);
    }

    @Override
    public DeliveryDto.EmployeeDto updateEmployeeLocation(int userId, String location) {
        User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User not found", null));

        Employee employee = employeeRepo.findByUsers(user).orElseThrow(() -> new BusinessException("Employee record not found for user", null));

        employee.setLocation(location);
        employeeRepo.save(employee);

        return DeliveryDto.EmployeeDto.builder()
                .id(employee.getId())
                .location(employee.getLocation())
                .build();
    }
}
