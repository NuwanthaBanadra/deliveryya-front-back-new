package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBankDetailDto;
import com.kaleox.deliveryya.entities.BankDetail;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class BankDetailSpec {

    public static @NonNull Specification<BankDetail> getBankDetailSpecification(PaginatedBankDetailDto dto) {
        Specification<BankDetail> spec = (root, query, cb) -> cb.conjunction();

        spec = spec.and((root, query, cb) -> cb.or(cb.isFalse(root.get("isDeleted")), cb.isNull(root.get("isDeleted"))));

        if (dto.getBankDetailId() != null && dto.getBankDetailId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getBankDetailId()));
        }

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("user").get("id"), dto.getUserId()));
        }

        if (dto.getBankId() != null && dto.getBankId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("bank").get("id"), dto.getBankId()));
        }

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";

                Predicate byName = cb.like(cb.lower(root.get("name")), searchTerm);
                Predicate byAccNumber = cb.like(cb.lower(root.get("accNumber")), searchTerm);
                Predicate byBranch = cb.like(cb.lower(root.get("branch")), searchTerm);
                Predicate byBankName = cb.like(cb.lower(root.get("bank").get("name")), searchTerm);

                return cb.or(byName, byAccNumber, byBranch, byBankName);
            });
        }

        return spec;
    }
}

