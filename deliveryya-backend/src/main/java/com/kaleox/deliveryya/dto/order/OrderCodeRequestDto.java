package com.kaleox.deliveryya.dto.order;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class OrderCodeRequestDto {
    Integer id;
    Integer qty;
    Boolean printed;
    Boolean printedBarcodesNeeded;
    RequestedUserDto user;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    Boolean generated;
    List<String> orderCodes;


    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    @Data
    @FieldDefaults(level = AccessLevel.PRIVATE)

    public static class RequestedUserDto {
        Integer id;
        String firstName;
        String lastName;
        String email;
    }
}


