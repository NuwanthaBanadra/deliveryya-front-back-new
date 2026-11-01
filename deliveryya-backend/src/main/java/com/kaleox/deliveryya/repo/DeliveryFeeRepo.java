package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.DeliveryFee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeliveryFeeRepo extends JpaRepository<DeliveryFee, Integer>, JpaSpecificationExecutor<DeliveryFee> {
    Optional<DeliveryFee> getDeliveryFeeByCity_Id(Integer cityId);
}
