package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.DeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryStatusRepo extends JpaRepository<DeliveryStatus, Integer> {
}