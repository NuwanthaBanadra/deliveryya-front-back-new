package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ComplainDto;
import com.kaleox.deliveryya.dto.ComplainStatusDto;
import com.kaleox.deliveryya.dto.ComplainTypeDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedComplainDto;

import java.util.List;

public interface ComplainService {
    ComplainDto setComplain(ComplainDto complainDto);

    ComplainDto updateComplain(Integer userId, ComplainDto complainDto);

    String deleteComplain(Integer userId, Integer complainId);

    PaginatedComplainDto getComplains(PaginatedComplainDto dto);

    List<ComplainTypeDto> getAllComplainTypes();

    List<ComplainStatusDto> getAllComplainStatuses();
}

