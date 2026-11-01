package com.kaleox.deliveryya.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResponseDto<T> {
    Integer status;
    String message;
    String desc;
    Map<String, String> exData;
    T object;
}
