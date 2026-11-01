package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.CUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.SetUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.UpdateUrgentJobDto;
import com.kaleox.deliveryya.dto.urgent.UrgentJobDto;
import com.kaleox.deliveryya.service.JobService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/urgent-jobs")
@RequiredArgsConstructor
public class JobController {

    private final JobService jobService;

    @PostMapping("/set-urgent-job")
    public ResponseEntity<ResponseDto<UrgentJobDto>> setUrgentJob(@Valid @RequestBody SetUrgentJobDto dto) {
        ResponseDto<UrgentJobDto> response = jobService.setUrgentJob(dto);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/update-urgent-job")
    public ResponseEntity<ResponseDto<UrgentJobDto>> updateUrgentJob(@Valid @RequestBody UpdateUrgentJobDto dto) {
        ResponseDto<UrgentJobDto> response = jobService.updateUrgentJob(dto);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/get-urgent-jobs")
    public ResponseEntity<ResponseDto<PaginatedUrgentJobDto>> getUrgentJobs(@Valid @RequestBody PaginatedUrgentJobDto dto) {
        ResponseDto<PaginatedUrgentJobDto> response = jobService.getUrgentJobs(dto);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/delete-urgent-job-by-id")
    public ResponseEntity<ResponseDto<Void>> deleteUrgentJobById(
            @RequestParam @NotNull(message = "Urgent job ID must be provided")
            @Min(value = 1, message = "Urgent job ID must be greater than 0")
            Integer id) {

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200)
                .message("Success")
                .desc(jobService.deleteUrgentJob(id))
                .build());
    }

    @GetMapping("/get-job-statuses")
    public ResponseEntity<ResponseDto<List<CommonIdNameDto>>> getJobStatuses(@RequestParam(required = false) Integer id) {
        ResponseDto<List<CommonIdNameDto>> response = jobService.getJobStatuses(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/update-urgent-job-confidential-data")
    public ResponseEntity<ResponseDto<Void>> updateUrgentJobConfidentialData(@RequestBody @Valid CUrgentJobDto dto) {

        if ((dto.getId() == null || dto.getId() <= 0)
                && (dto.getJobCode() == null || dto.getJobCode().trim().isEmpty())) {
            throw new BusinessException("Either Job ID or Job Code is required and must be valid", null);
        }

        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .status(200).message("Success")
                .message(jobService.updateUrgentJobConfidentialData(dto))
                .build());
    }
}
