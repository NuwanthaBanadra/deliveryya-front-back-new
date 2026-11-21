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

    public static @NonNull Specification<CompanyWallet> getBranchWalletSpecification(
            Integer branchId, PaginatedWalletHistoryDto dto) {
        return (root, query, cb) -> applyCommonFilters(
                root, query, cb, dto, cb.equal(root.get("branch").get("id"), branchId));
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
            predicate = cb.and(predicate, cb.greaterThanOrEqualTo(root.get("amount"), dto.getMinAmount()));
        }

        if (dto.getMaxAmount() != null && dto.getMaxAmount() > 0) {
            predicate = cb.and(predicate, cb.lessThanOrEqualTo(root.get("amount"), dto.getMaxAmount()));
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String searchTerm = "%" + dto.getSearch().toLowerCase() + "%";
            Predicate byNote = cb.like(cb.lower(cb.coalesce(root.get("note"), "")), searchTerm);
            Predicate byOtherReason = cb.like(cb.lower(cb.coalesce(root.get("otherReason"), "")), searchTerm);
            Predicate byRef = cb.like(cb.lower(cb.coalesce(root.get("ref"), "")), searchTerm);
            Predicate byCode = cb.like(cb.lower(cb.coalesce(root.get("code"), "")), searchTerm);
            predicate = cb.and(predicate, cb.or(byNote, byOtherReason, byRef, byCode));
        }

        if (dto.getPaymentCategoryId() != null && dto.getPaymentCategoryId() > 0) {
            predicate = cb.and(predicate, cb.equal(root.get("paymentCategory").get("id"), dto.getPaymentCategoryId()));
        }

        if (dto.getPaymentStatusId() != null && dto.getPaymentStatusId() > 0) {
            predicate = cb.and(predicate, cb.equal(root.get("paymentStatus").get("id"), dto.getPaymentStatusId()));
        }

        if (dto.getBranchId() != null && dto.getBranchId() > 0) {
            predicate = cb.and(predicate, cb.equal(root.get("branch").get("id"), dto.getBranchId()));
        }

        if (dto.getIsExpense() != null) {
            predicate = cb.and(predicate, cb.equal(root.get("isExpense"), dto.getIsExpense()));
        }

        return predicate;
    }
}
