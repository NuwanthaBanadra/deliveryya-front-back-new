package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DiscountRepo extends JpaRepository<Discount, Integer>, JpaSpecificationExecutor<Discount> {

    List<Discount> findByUserId(Integer userId);

    Optional<Discount> findByUserIdAndCityId(Integer userId, Integer cityId);

    void deleteByUserIdAndCityId(Integer userId, Integer cityId);
}
