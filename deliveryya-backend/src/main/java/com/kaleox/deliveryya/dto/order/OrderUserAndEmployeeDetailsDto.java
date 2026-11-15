package com.kaleox.deliveryya.dto.order;

import com.kaleox.deliveryya.dto.DeliveryStatusDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import lombok.Builder;
import lombok.Value;

import java.io.Serializable;
import java.time.LocalDateTime;

@Value
@Builder
public class OrderUserAndEmployeeDetailsDto implements Serializable {
    String orderCode;
    UserDetailsDto user;
    EmployeeDetailsDto employee;
    DeliveryStatusDto deliveryStatus;
    LocalDateTime lastUpdatedAt;

    @Value
    @Builder
    public static class UserDetailsDto implements Serializable {
        Integer id;
        String firstName;
        String lastName;
        String email;
        String nic;
        String profileImg;
        Boolean isActive;
        Boolean emailVerified;
        Boolean isEmployee;
    }

    @Value
    @Builder
    public static class EmployeeDetailsDto implements Serializable {
        Integer id;
        String location;
        String liveLocation;
        String mobile;
        String whatsapp;
        CommonIdNameDto verificationStatus;
        CommonIdNameDto branch;
        UserDetailsDto user;
    }
}

