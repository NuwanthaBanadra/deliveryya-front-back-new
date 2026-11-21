package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.CompanyWallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyWalletRepo extends JpaRepository<CompanyWallet, Integer>, JpaSpecificationExecutor<CompanyWallet> {
    Optional<CompanyWallet> findFirstByIsActiveTrueOrderByIdDesc();

    List<CompanyWallet> findAllByOrderByCreatedAtDesc();

    @Query("SELECT MAX(w.id) FROM CompanyWallet w WHERE w.isActive = true")
    Optional<Integer> findLatestActiveId();

    @Query("SELECT w FROM CompanyWallet w ORDER BY w.createdAt DESC")
    List<CompanyWallet> findAllHistory();

    Optional<CompanyWallet> findByRef(String ref);

    List<CompanyWallet> findByPaymentRecord_Id(Integer paymentRecordId);

    List<CompanyWallet> findByBranch_IdOrderByCreatedAtDesc(Integer branchId);

    Optional<CompanyWallet> findFirstByBranch_IdAndIsActiveTrueOrderByIdDesc(Integer branchId);

    Page<CompanyWallet> findAll(Pageable pageable);
}