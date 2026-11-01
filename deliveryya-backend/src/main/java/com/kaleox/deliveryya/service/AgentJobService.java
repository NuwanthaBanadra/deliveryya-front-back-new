package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.agentjob.*;

import java.util.List;

public interface AgentJobService {

    ResponseDto<AgentJobDto> setAgentJob(SetAgentJobDto dto);

    ResponseDto<Void> updateAcceptance(List<UpdateAgentJobAcceptanceItemDto> items, int userId);

    ResponseDto<Void> deleteAgentJobs(DeleteAgentJobDto dto, int userId);

    ResponseDto<PaginatedAgentJobDto> getAgentJobs(PaginatedAgentJobDto dto);

    ResponseDto<PickUpRequestDto> setPickUpRequest(SetPickUpRequestDto dto);

    ResponseDto<PickUpRequestDto> updatePickUpRequest(UpdatePickUpRequestDto dto);

    ResponseDto<PaginatedPickUpRequestDto> getPickUpRequests(PaginatedPickUpRequestDto dto);

    ResponseDto<Void> deletePickUpRequest(DeletePickUpRequestDto dto);
}

