package com.kaleox.deliveryya.service.specification;

import com.kaleox.deliveryya.dto.paginatedDto.PaginatedWalletHistoryDto;
import com.kaleox.deliveryya.entities.AgentWallet;
import com.kaleox.deliveryya.entities.ClientMarketOwnerWallet;
import com.kaleox.deliveryya.entities.CompanyWallet;
import jakarta.persistence.criteria.Predicate;
import org.jspecify.annotations.NonNull;
import org.springframework.data.jpa.domain.Specification;

public class WalletHistorySpec {

    public static @NonNull Specification<AgentWallet> getAgentWalletSpecification(Integer agentId, PaginatedWalletHistoryDto dto) {
        Specification<AgentWallet> spec = (root, query, cb) -> {
            Predicate basePredicate = cb.equal(root.get("agent").get("id"), agentId);
            return applyCommonFilters(root, query, cb, dto, basePredicate);
        };
        return spec;
    }

    public static @NonNull Specification<ClientMarketOwnerWallet> getClientMarketOwnerWalletSpecification(Integer userId, PaginatedWalletHistoryDto dto) {
        Specification<ClientMarketOwnerWallet> spec = (root, query, cb) -> {
            Predicate basePredicate = cb.equal(root.get("user").get("id"), userId);
            return applyCommonFilters(root, query, cb, dto, basePredicate);
        };
        return spec;
    }

    public static @NonNull Specification<CompanyWallet> getCompanyWalletSpecification(PaginatedWalletHistoryDto dto) {
        Specification<CompanyWallet> spec = (root, query, cb) -> {
            return applyCommonFilters(root, query, cb, dto, cb.conjunction());
        };
        return spec;
    }

    private static <T> Predicate applyCommonFilters(jakarta.persistence.criteria.Root<T> root, jakarta.persistence.criteria.CriteriaQuery<?> query, jakarta.persistence.criteria.CriteriaBuilder cb, PaginatedWalletHistoryDto dto, Predicate basePredicate) {
        Predicate predicate = basePredicate;

        if (dto.getFromDate() != null && dto.getToDate() != null) {
            predicate = cb.and(predicate, cb.between(root.get("createdAt"), dto.getFromDate(), dto.getToDate()));
        } else if (dto.getFromDate() != null) {
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("createdAt"), dto.getFromDate()));
        } else if (dto.getToDate() != null) {
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("createdAt"), dto.getToDate()));
        }

        if (dto.getMinAmount() != null && dto.getMinAmount() > 0) {
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("balance"), dto.getMinAmount()));
        }

        if (dto.getMaxAmount() != null && dto.getMaxAmount() > 0) {
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("balance"), dto.getMaxAmount()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
            Predicate byNote = cb.like(cb.lower(cb.coalesce(root.get("note"), "")), searchTerm);
            Predicate byOtherReason = cb.like(cb.lower(cb.coalesce(root.get("otherReason"), "")), searchTerm);
            Predicate byRef = cb.like(cb.lower(cb.coalesce(root.get("ref"), "")), searchTerm);
            predicate = cb.and(predicate, cb.or(byNote, byOtherReason, byRef));
        }

        return predicate;
    }
}
