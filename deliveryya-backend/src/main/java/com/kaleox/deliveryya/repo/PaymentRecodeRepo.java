package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Order;
import com.kaleox.deliveryya.entities.PaymentRecord;
import com.kaleox.deliveryya.entities.UrgentJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRecodeRepo extends JpaRepository<PaymentRecord, Integer>, JpaSpecificationExecutor<PaymentRecord> {
}

