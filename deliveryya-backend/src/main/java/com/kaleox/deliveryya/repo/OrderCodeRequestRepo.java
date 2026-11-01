package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.OrderCodeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OrderCodeRequestRepo extends JpaRepository<OrderCodeRequest, Integer>, JpaSpecificationExecutor<OrderCodeRequest> {
}

