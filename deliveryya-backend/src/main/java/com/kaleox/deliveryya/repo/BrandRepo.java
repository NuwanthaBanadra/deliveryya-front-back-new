package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Brand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface BrandRepo extends JpaRepository<Brand, Integer>, JpaSpecificationExecutor<Brand> {
}
