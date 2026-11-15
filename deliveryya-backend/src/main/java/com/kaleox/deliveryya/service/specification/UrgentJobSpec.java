package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUrgentJobDto;
import com.kaleox.deliveryya.entities.UrgentJob;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class UrgentJobSpec {

    public static @NonNull Specification<UrgentJob> getUrgentJobSpecification(PaginatedUrgentJobDto dto) {
        Specification<UrgentJob> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getUrgentJobId() != null && dto.getUrgentJobId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getUrgentJobId()));
            return spec;
        }

        if (dto.getJobStatusId() != null && dto.getJobStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("jobStatus").get("id"), dto.getJobStatusId()));
        }

        if (dto.getVerificationStatusId() != null && dto.getVerificationStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("verificationStatus").get("id"), dto.getVerificationStatusId()));
        }

        if (dto.getVehicleTypeId() != null && dto.getVehicleTypeId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("vehicleType").get("id"), dto.getVehicleTypeId()));
        }

        if (dto.getPlacedUserId() != null && !dto.getPlacedUserId().trim().isEmpty() && !"0".equals(dto.getPlacedUserId().trim())) {
            String placedUserId = dto.getPlacedUserId().trim();
            spec = spec.and((root, query, cb) -> cb.equal(root.get("createdBy"), placedUserId));
        }

        if (dto.getJobCode() != null && !dto.getJobCode().isBlank() && !"0".equals(dto.getJobCode())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("jobCode")), dto.getJobCode().toLowerCase()));
        }

        if (dto.getMobile() != null && !dto.getMobile().isBlank() && !"0".equals(dto.getMobile())) {
            String mobileTerm = "%" + dto.getMobile().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("mobile")), mobileTerm));
        }

        if (dto.getNic() != null && !dto.getNic().isBlank() && !"0".equals(dto.getNic())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("nic")), dto.getNic().toLowerCase()));
        }

        if (dto.getEmail() != null && !dto.getEmail().isBlank() && !"0".equals(dto.getEmail())) {
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("email")), dto.getEmail().toLowerCase()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank() && !"0".equals(dto.getSearch())) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("job")), searchTerm),
                        cb.like(cb.lower(root.get("desc")), searchTerm),
                        cb.like(cb.lower(root.get("mobile")), searchTerm),
                        cb.like(cb.lower(root.get("username")), searchTerm),
                        cb.like(cb.lower(root.get("nic")), searchTerm),
                        cb.like(cb.lower(root.get("email")), searchTerm),
                        cb.like(cb.lower(root.get("jobCode")), searchTerm)
                );
            });
        }

        return spec;
    }
}

