package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedUserDto;
import com.kaleox.deliveryya.entities.User;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class UserSpec {

    public static @NonNull Specification<User> getUserSpecification(PaginatedUserDto dto) {
        Specification<User> spec = (root, query, cb) -> cb.conjunction();

        if (dto.getUserId() != null && dto.getUserId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("id"), dto.getUserId()));
            return spec;
        }

        if (dto.getUserRoleId() != null && dto.getUserRoleId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("userRole").get("id"), dto.getUserRoleId()));
        }

        if (dto.getVerificationStatusId() != null && dto.getVerificationStatusId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("verificationStatus").get("id"), dto.getVerificationStatusId()));
        }

        if (dto.getGenderId() != null && dto.getGenderId() != 0) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("gender").get("id"), dto.getGenderId()));
        }

        if (dto.getIsActive() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isActive"), dto.getIsActive()));
        }

        if (dto.getEmailVerified() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("emailVerified"), dto.getEmailVerified()));
        }

        if (dto.getHasMarket() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("hasMarket"), dto.getHasMarket()));
        }

        if (dto.getIsEmployee() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("isEmployee"), dto.getIsEmployee()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            spec = spec.and((root, query, cb) -> {
                String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";

                Predicate byFirstName = cb.like(cb.lower(root.get("firstName")), searchTerm);
                Predicate byLastName = cb.like(cb.lower(root.get("lastName")), searchTerm);
                Predicate byEmail = cb.like(cb.lower(root.get("email")), searchTerm);
                Predicate byNic = cb.like(cb.lower(root.get("nic")), searchTerm);

                return cb.or(byFirstName, byLastName, byEmail, byNic);
            });
        }

        return spec;
    }
}

