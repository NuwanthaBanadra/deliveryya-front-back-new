package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.agentjob.*;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.AgentJobService;
import com.kaleox.deliveryya.service.specification.AgentJobSpec;
import com.kaleox.deliveryya.service.specification.PickUpRequestsSpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class AgentJobServiceImpl implements AgentJobService {

    private final AgentJobRepo agentJobRepo;
    private final EmployeeRepo employeeRepo;
    private final UserRepo userRepo;
    private final UrgentJobRepo urgentJobRepo;
    private final PickUpRequestsRepo pickUpRequestsRepo;

    // ------------------------------------------------------------------ //
    //  SET
    // ------------------------------------------------------------------ //

    @Override
    public ResponseDto<AgentJobDto> setAgentJob(SetAgentJobDto dto) {

        Employee employee = employeeRepo.findByUsers_Id(dto.getUserId())
                .orElseThrow(() -> new BusinessException("No employee record found for user ID: " + dto.getUserId(), null));

        UrgentJob urgentJob = null;
        if (dto.getUrgentJobId() != null) {
            urgentJob = urgentJobRepo.findById(dto.getUrgentJobId()).orElseThrow(() -> new BusinessException("Urgent job not found with ID: " + dto.getUrgentJobId(), null));
        }

        if (dto.getTasks() == null || dto.getTasks().isEmpty()) {
            throw new BusinessException("At least one task is required", null);
        }

        AgentJob agentJob = AgentJob.builder()
                .employees(employee)
                .urgentJob(urgentJob)
                // Keep the legacy summary task column populated with the first task text.
                .task(dto.getTask())
                .accepted(false)          // always default to false
                .isComplete(false)
                .build();

        List<AgentJobTask> tasks = dto.getTasks().stream()
                .map(item -> AgentJobTask.builder()
                        .task(item.getTask())
                        .location(item.getLocation())
                        .isComplete(Boolean.TRUE.equals(item.getIsComplete()))
                        .beAt(item.getBeAt())
                        .agentJob(agentJob)
                        .build())
                .toList();

        if (urgentJob == null) {
            agentJob.setAgentJobTasks(tasks);
        }

        AgentJob saved = agentJobRepo.save(agentJob);

        return ResponseDto.<AgentJobDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent job created successfully")
                .object(buildAgentJobDto(saved))
                .build();
    }

    // ------------------------------------------------------------------ //
    //  UPDATE ACCEPTANCE
    // ------------------------------------------------------------------ //

    @Override
    public ResponseDto<Void> updateAcceptance(List<UpdateAgentJobAcceptanceItemDto> items, int userId) {
        log.info("Updating acceptance for {} jobs by userId: {}", items.size(), userId);

        // Resolve employee from authenticated user
        Employee employee = employeeRepo.findByUsers_Id(userId)
                .orElseThrow(() -> new BusinessException("No employee record found for user ID: " + userId, null));

        for (UpdateAgentJobAcceptanceItemDto item : items) {
            AgentJob agentJob = agentJobRepo.findById(item.getAgentJobId())
                    .orElseThrow(() -> new BusinessException(
                            "Agent job not found with ID: " + item.getAgentJobId(), null));

            // Ensure the authenticated employee owns this job
            if (!agentJob.getEmployees().getId().equals(employee.getId())) {
                throw new BusinessException(
                        "Agent job ID " + item.getAgentJobId() + " does not belong to the authenticated employee", null);
            }

            agentJob.setAccepted(item.getAccepted());
            agentJobRepo.save(agentJob);
        }

        return ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc("Agent job acceptance status updated successfully")
                .build();
    }

    // ------------------------------------------------------------------ //
    //  DELETE
    // ------------------------------------------------------------------ //

    @Override
    public ResponseDto<Void> deleteAgentJobs(DeleteAgentJobDto dto, int userId) {
        log.info("Deleting agent jobs – deleteAll={}, userId={}", dto.getDeleteAll(), userId);

        if (Boolean.TRUE.equals(dto.getDeleteAll())) {
            // Determine whose jobs to delete
            int targetEmployeeId;

            if (dto.getUserId() != null && dto.getUserId() != 0) {
                // Caller explicitly provided an employeeId (e.g. admin deleting another employee's jobs)
                targetEmployeeId = employeeRepo.findByUsers_Id(dto.getUserId())
                        .orElseThrow(() -> new BusinessException(
                                "No employee record found for user ID: " + dto.getUserId(), null))
                        .getId();
            } else {
                // Fall back to the authenticated user's employee record
                Employee employee = employeeRepo.findByUsers_Id(userId)
                        .orElseThrow(() -> new BusinessException(
                                "No employee record found for user ID: " + userId, null));
                targetEmployeeId = employee.getId();
            }

            agentJobRepo.deleteByEmployees_Id(targetEmployeeId);

            return ResponseDto.<Void>builder()
                    .status(200)
                    .message("Success")
                    .desc("All agent jobs deleted for employee ID: " + targetEmployeeId)
                    .build();
        }

        // Delete specific job IDs
        if (dto.getJobIds() == null || dto.getJobIds().isEmpty()) {
            throw new BusinessException(
                    "Either set deleteAll=true or provide a non-empty jobIds list", null);
        }

        // Validate that every requested ID exists
        List<AgentJob> jobs = agentJobRepo.findAllById(dto.getJobIds());
        if (jobs.size() != dto.getJobIds().size()) {
            Set<Integer> found = jobs.stream().map(AgentJob::getId).collect(Collectors.toSet());
            List<Integer> missing = dto.getJobIds().stream()
                    .filter(id -> !found.contains(id))
                    .toList();
            throw new BusinessException("Agent jobs not found with IDs: " + missing, null);
        }

        agentJobRepo.deleteAll(jobs);

        return ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc("Deleted " + jobs.size() + " agent job(s) successfully")
                .build();
    }

    // ------------------------------------------------------------------ //
    //  PAGINATED GET
    // ------------------------------------------------------------------ //

    @Override
    public ResponseDto<PaginatedAgentJobDto> getAgentJobs(PaginatedAgentJobDto dto) {
        log.info("Fetching agent jobs – page={}, size={}", dto.getPageNumber(), dto.getCountPerPage());

        Pageable pageable = PageRequest.of(
                dto.getPageNumber(),
                dto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<AgentJob> spec = AgentJobSpec.getAgentJobSpecification(dto);
        Page<AgentJob> page = agentJobRepo.findAll(spec, pageable);

        dto.setTotalCount(page.getTotalElements());
        dto.setTotalPages(page.getTotalPages());
        dto.setCountPerPage(page.getSize());

        // Collect all unique createdBy user IDs to fetch in one query
        List<AgentJob> jobs = page.getContent();
        Set<Integer> creatorIds = jobs.stream()
                .map(j -> parseCreatedBy(j.getCreatedBy()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, User> creatorMap = new HashMap<>();
        if (!creatorIds.isEmpty()) {
            userRepo.findAllById(creatorIds)
                    .forEach(u -> creatorMap.put(u.getId(), u));
        }

        List<AgentJobDto> dtoList = jobs.stream()
                .map(j -> buildAgentJobDto(j, creatorMap))
                .toList();

        dto.setItems(dtoList);

        return ResponseDto.<PaginatedAgentJobDto>builder()
                .status(200)
                .message("Success")
                .desc("Agent jobs fetched successfully")
                .object(dto)
                .build();
    }

    @Override
    public ResponseDto<PickUpRequestDto> setPickUpRequest(SetPickUpRequestDto dto) {
        User user = userRepo.findById(dto.getUserId())
                .orElseThrow(() -> new BusinessException("User not found with ID: " + dto.getUserId(), null));

        PickUpRequests request = PickUpRequests.builder()
                .message(dto.getMessage())
                .location(dto.getLocation())
                .isAccepted(Boolean.TRUE.equals(dto.getIsAccepted()))
                .isCompleted(Boolean.TRUE.equals(dto.getIsCompleted()))
                .isDeleted(false)
                .user(user)
                .build();

        PickUpRequests saved = pickUpRequestsRepo.save(request);

        return ResponseDto.<PickUpRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("Pickup request created successfully")
                .object(buildPickUpRequestDto(saved))
                .build();
    }

    @Override
    public ResponseDto<PickUpRequestDto> updatePickUpRequest(UpdatePickUpRequestDto dto) {
        if (dto.getIsAccepted() == null && dto.getIsCompleted() == null) {
            throw new BusinessException("At least one status field is required", null);
        }

        PickUpRequests request = pickUpRequestsRepo.findByIdAndIsDeletedFalse(dto.getPickupRequestId())
                .orElseThrow(() -> new BusinessException("Pickup request not found with ID: " + dto.getPickupRequestId(), null));

        if (dto.getIsAccepted() != null) {
            request.setIsAccepted(dto.getIsAccepted());
        }

        if (dto.getIsCompleted() != null) {
            request.setIsCompleted(dto.getIsCompleted());
        }

        PickUpRequests saved = pickUpRequestsRepo.save(request);

        return ResponseDto.<PickUpRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("Pickup request updated successfully")
                .object(buildPickUpRequestDto(saved))
                .build();
    }

    @Override
    public ResponseDto<PaginatedPickUpRequestDto> getPickUpRequests(PaginatedPickUpRequestDto dto) {
        log.info("Fetching pickup requests - page={}, size={}", dto.getPageNumber(), dto.getCountPerPage());

        Pageable pageable = PageRequest.of(
                dto.getPageNumber(),
                dto.getCountPerPage(),
                Sort.by("id").descending()
        );

        Specification<PickUpRequests> spec = PickUpRequestsSpec.getPickUpRequestsSpecification(dto);
        Page<PickUpRequests> page = pickUpRequestsRepo.findAll(spec, pageable);

        dto.setTotalCount(page.getTotalElements());
        dto.setTotalPages(page.getTotalPages());
        dto.setCountPerPage(page.getSize());

        List<PickUpRequests> requests = page.getContent();
        Set<Integer> creatorIds = requests.stream()
                .map(r -> parseCreatedBy(r.getCreatedBy()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Integer, User> creatorMap = new HashMap<>();
        if (!creatorIds.isEmpty()) {
            userRepo.findAllById(creatorIds)
                    .forEach(u -> creatorMap.put(u.getId(), u));
        }

        List<PickUpRequestDto> dtoList = requests.stream()
                .map(r -> buildPickUpRequestDto(r, creatorMap))
                .toList();

        dto.setItems(dtoList);

        return ResponseDto.<PaginatedPickUpRequestDto>builder()
                .status(200)
                .message("Success")
                .desc("Pickup requests fetched successfully")
                .object(dto)
                .build();
    }

    @Override
    public ResponseDto<Void> deletePickUpRequest(DeletePickUpRequestDto dto) {
        PickUpRequests request = pickUpRequestsRepo.findByIdAndIsDeletedFalse(dto.getPickupRequestId())
                .orElseThrow(() -> new BusinessException("Pickup request not found with ID: " + dto.getPickupRequestId(), null));

        try {
            pickUpRequestsRepo.delete(request);
            pickUpRequestsRepo.flush();

            return ResponseDto.<Void>builder()
                    .status(200)
                    .message("Success")
                    .desc("Pickup request deleted successfully")
                    .build();
        } catch (Exception ex) {
            log.warn("Hard delete failed for pickup request ID {}. Falling back to soft delete.", dto.getPickupRequestId(), ex);
            request.setIsDeleted(true);
            pickUpRequestsRepo.save(request);

            return ResponseDto.<Void>builder()
                    .status(200)
                    .message("Success")
                    .desc("Pickup request marked as deleted")
                    .build();
        }
    }

    // ------------------------------------------------------------------ //
    //  HELPERS
    // ------------------------------------------------------------------ //

    /**
     * Build DTO for a single AgentJob, resolving the createdBy user on-the-fly.
     */
    private AgentJobDto buildAgentJobDto(AgentJob job) {
        Integer creatorId = parseCreatedBy(job.getCreatedBy());
        User creatorUser = null;
        if (creatorId != null) {
            creatorUser = userRepo.findById(creatorId).orElse(null);
        }
        return mapToDto(job, creatorUser);
    }

    /**
     * Build DTO for a single AgentJob using a pre-fetched creator map (batch use).
     */
    private AgentJobDto buildAgentJobDto(AgentJob job, Map<Integer, User> creatorMap) {
        Integer creatorId = parseCreatedBy(job.getCreatedBy());
        User creatorUser = creatorId != null ? creatorMap.get(creatorId) : null;
        return mapToDto(job, creatorUser);
    }

    private AgentJobDto mapToDto(AgentJob job, User creatorUser) {
        // Urgent job ref (nullable)
        AgentJobDto.UrgentJobRef urgentJobRef = null;
        if (job.getUrgentJob() != null) {
            urgentJobRef = new AgentJobDto.UrgentJobRef(
                    job.getUrgentJob().getId(),
                    job.getUrgentJob().getJobCode()
            );
        }

        // Employee ref
        Employee emp = job.getEmployees();
        User empUser = emp.getUsers();
        AgentJobDto.EmployeeRef employeeRef = new AgentJobDto.EmployeeRef(
                emp.getId(),
                empUser.getId(),
                empUser.getFirstName(),
                empUser.getLastName(),
                emp.getMobile(),
                emp.getWhatsapp()
        );

        // CreatedBy user ref (nullable)
        AgentJobDto.UserRef createdByRef = null;
        if (creatorUser != null) {
            createdByRef = new AgentJobDto.UserRef(
                    creatorUser.getId(),
                    creatorUser.getFirstName(),
                    creatorUser.getLastName(),
                    creatorUser.getEmail()
            );
        }

        List<AgentJobDto.TaskRef> taskRefs = Optional.ofNullable(job.getAgentJobTasks())
                .orElseGet(List::of)
                .stream()
                .map(task -> new AgentJobDto.TaskRef(
                        task.getId(),
                        task.getTask(),
                        task.getLocation(),
                        task.getIsComplete(),
                        task.getBeAt()
                ))
                .toList();

        return new AgentJobDto(
                job.getId(),
                job.getTask(),
                job.getAccepted(),
                job.getCreatedAt(),
                job.getUpdatedAt(),
                taskRefs,
                urgentJobRef,
                employeeRef,
                createdByRef
        );
    }

    private PickUpRequestDto buildPickUpRequestDto(PickUpRequests request) {
        Integer creatorId = parseCreatedBy(request.getCreatedBy());
        User creatorUser = null;
        if (creatorId != null) {
            creatorUser = userRepo.findById(creatorId).orElse(null);
        }
        return mapPickUpRequestToDto(request, creatorUser);
    }

    private PickUpRequestDto buildPickUpRequestDto(PickUpRequests request, Map<Integer, User> creatorMap) {
        Integer creatorId = parseCreatedBy(request.getCreatedBy());
        User creatorUser = creatorId != null ? creatorMap.get(creatorId) : null;
        return mapPickUpRequestToDto(request, creatorUser);
    }

    private PickUpRequestDto mapPickUpRequestToDto(PickUpRequests request, User creatorUser) {
        User user = request.getUser();
        PickUpRequestDto.UserRef userRef = new PickUpRequestDto.UserRef(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail()
        );

        PickUpRequestDto.UserRef createdByRef = null;
        if (creatorUser != null) {
            createdByRef = new PickUpRequestDto.UserRef(
                    creatorUser.getId(),
                    creatorUser.getFirstName(),
                    creatorUser.getLastName(),
                    creatorUser.getEmail()
            );
        }

        return new PickUpRequestDto(
                request.getId(),
                request.getMessage(),
                request.getIsAccepted(),
                request.getIsDeleted(),
                request.getIsCompleted(),
                request.getLocation(),
                request.getCreatedAt(),
                request.getUpdatedAt(),
                userRef,
                createdByRef
        );
    }

    /**
     * Safely parses the audit createdBy string (which stores a userId) into an Integer.
     * Returns null for non-numeric values such as "system".
     */
    private Integer parseCreatedBy(String createdBy) {
        if (createdBy == null || createdBy.isBlank()) return null;
        try {
            return Integer.parseInt(createdBy);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}

