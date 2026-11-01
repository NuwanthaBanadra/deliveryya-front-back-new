package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.agentjob.*;
import com.kaleox.deliveryya.service.AgentJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/agent-jobs")
public class AgentJobController {

    private final AgentJobService agentJobService;

    /**
     * Create a new agent job.
     * accepted defaults to false.
     * When an urgentJobId is provided, AgentJobItems will be ignored but sample data it needed to pass though Validations.
     */
    @PostMapping("/set-agent-job")
    public ResponseEntity<ResponseDto<AgentJobDto>> setAgentJob(@Valid @RequestBody SetAgentJobDto dto) {

        return ResponseEntity.ok(agentJobService.setAgentJob(dto));
    }

    /**
     * Accept or reject one or more agent jobs.
     * The authenticated user's employee record is used to validate ownership.
     * <p>
     * Body: List of { agentJobId, accepted }
     */
    @PutMapping("/update-acceptance")
    public ResponseEntity<ResponseDto<Void>> updateAcceptance(
            @Valid @RequestBody List<UpdateAgentJobAcceptanceItemDto> items,
            @AuthenticationPrincipal UserDetails userDetails) {

        if (items == null || items.isEmpty()) {
            throw new BusinessException("At least one item is required", null);
        }

        int userId = Integer.parseInt(userDetails.getUsername());
        return ResponseEntity.ok(agentJobService.updateAcceptance(items, userId));
    }

    /**
     * Delete agent jobs.
     * <p>
     * Scenarios:
     * - deleteAll=true  → deletes every job belonging to the resolved employee
     * (employeeId from body if provided, otherwise from auth)
     * - deleteAll=false → deletes the specific jobIds provided in the body
     */
    @DeleteMapping("/delete")
    public ResponseEntity<ResponseDto<Void>> deleteAgentJobs(
            @RequestBody DeleteAgentJobDto dto,
            @AuthenticationPrincipal UserDetails userDetails) {

        int userId = Integer.parseInt(userDetails.getUsername());
        return ResponseEntity.ok(agentJobService.deleteAgentJobs(dto, userId));
    }

    /**
     * Paginated list of agent jobs with filtering.
     * <p>
     * Filters: agentJobId, employeeId, accepted, search (employee first/last name)
     */
    @PostMapping("/get-agent-jobs")
    public ResponseEntity<ResponseDto<PaginatedAgentJobDto>> getAgentJobs(
            @Valid @RequestBody PaginatedAgentJobDto dto) {

        return ResponseEntity.ok(agentJobService.getAgentJobs(dto));
    }

    @PostMapping("/pickup-requests/set")
    public ResponseEntity<ResponseDto<PickUpRequestDto>> setPickUpRequest(
            @Valid @RequestBody SetPickUpRequestDto dto) {

        return ResponseEntity.ok(agentJobService.setPickUpRequest(dto));
    }

    @PutMapping("/pickup-requests/update")
    public ResponseEntity<ResponseDto<PickUpRequestDto>> updatePickUpRequest(
            @Valid @RequestBody UpdatePickUpRequestDto dto) {

        return ResponseEntity.ok(agentJobService.updatePickUpRequest(dto));
    }

    @PostMapping("/pickup-requests/get")
    public ResponseEntity<ResponseDto<PaginatedPickUpRequestDto>> getPickUpRequests(
            @Valid @RequestBody PaginatedPickUpRequestDto dto) {

        return ResponseEntity.ok(agentJobService.getPickUpRequests(dto));
    }

    @DeleteMapping("/pickup-requests/delete")
    public ResponseEntity<ResponseDto<Void>> deletePickUpRequest(
            @Valid @RequestBody DeletePickUpRequestDto dto) {

        return ResponseEntity.ok(agentJobService.deletePickUpRequest(dto));
    }


}

