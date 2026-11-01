package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.CUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.SetUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.UpdateUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.UrgentJobDto;

import java.util.List;

public interface JobService {

    ResponseDto<UrgentJobDto> setUrgentJob(SetUrgentJobDto dto);

    ResponseDto<UrgentJobDto> updateUrgentJob(UpdateUrgentJobDto dto);

    ResponseDto<PaginatedUrgentJobDto> getUrgentJobs(PaginatedUrgentJobDto dto);

    ResponseDto<List<CommonIdNameDto>> getJobStatuses(Integer id);

    String deleteUrgentJob(Integer urgentJobId);

    String updateUrgentJobConfidentialData(CUrgentJobDto cUrgentJobDto);
}

