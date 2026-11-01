package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.PickUpRequests;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface PickUpRequestsRepo extends JpaRepository<PickUpRequests, Integer>, JpaSpecificationExecutor<PickUpRequests> {

    Optional<PickUpRequests> findByIdAndIsDeletedFalse(Integer id);
}

