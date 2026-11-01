package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.order.ThirdPartySendersDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedThirdPartySendersDto;

public interface ThirdPartySendersService {
    PaginatedThirdPartySendersDto getThirdPartySenders(PaginatedThirdPartySendersDto dto);

    ResponseDto<ThirdPartySendersDto> updateThirdPartySender(ThirdPartySendersDto dto);

    ResponseDto<Void> deleteThirdPartySender(Integer id);
}

