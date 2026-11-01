package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.AgentWallet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AgentWalletRepo extends JpaRepository<AgentWallet, Integer>, JpaSpecificationExecutor<AgentWallet> {
    Optional<AgentWallet> findByAgent_Id(Integer agentId);

    Optional<AgentWallet> findByAgent_IdAndIsActiveTrue(Integer agentId);

    List<AgentWallet> findByAgent_IdOrderByCreatedAtDesc(Integer agentId);

    @Query("SELECT MAX(w.id) FROM AgentWallet w WHERE w.agent.id = :agentId")
    Optional<Integer> findLatestIdByAgentId(Integer agentId);

    @Query("SELECT w FROM AgentWallet w WHERE w.agent.id = :agentId ORDER BY w.createdAt DESC")
    List<AgentWallet> findHistoryByAgentId(Integer agentId);

    Optional<AgentWallet> findByRef(String ref);

    Page<AgentWallet> findByAgent_Id(Integer agentId, Pageable pageable);

    Optional<AgentWallet> findByIdAndAgent_Id(Integer id, Integer agentId);
}