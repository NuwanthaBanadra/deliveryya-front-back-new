package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBranchDto;
import com.kaleox.deliveryya.entities.Branch;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class BranchSpec {

    public static @NonNull Specification<Branch> getBranchSpecification(PaginatedBranchDto dto) {
        Specification<Branch> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getId() != null && dto.getId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getId()));
            return spec;
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String term = "%" + dto.getSearch().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), term),
                    cb.like(cb.lower(root.get("location")), term)
            ));
        }

        if (dto.getCityId() != null && dto.getCityId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("city").get("id"), dto.getCityId()));
        }

        return spec;
    }
}

