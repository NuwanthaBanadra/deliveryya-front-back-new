package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.ClientMarketOwnerWallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientMarketOwnerWalletRepo extends JpaRepository<ClientMarketOwnerWallet, Integer>, JpaSpecificationExecutor<ClientMarketOwnerWallet> {
    Optional<ClientMarketOwnerWallet> findByUser_Id(Integer userId);

    Optional<ClientMarketOwnerWallet> findByUser_IdAndIsActiveTrue(Integer userId);

    List<ClientMarketOwnerWallet> findByUser_IdOrderByCreatedAtDesc(Integer userId);

    @Query("SELECT MAX(w.id) FROM ClientMarketOwnerWallet w WHERE w.user.id = :userId")
    Optional<Integer> findLatestIdByUserId(Integer userId);

    @Query("SELECT w FROM ClientMarketOwnerWallet w WHERE w.user.id = :userId ORDER BY w.createdAt DESC")
    List<ClientMarketOwnerWallet> findHistoryByUserId(Integer userId);

    Page<ClientMarketOwnerWallet> findByUser_Id(Integer userId, Pageable pageable);

    Optional<ClientMarketOwnerWallet> findByIdAndUser_Id(Integer id, Integer userId);

    Optional<ClientMarketOwnerWallet> findByRef(String ref);
}