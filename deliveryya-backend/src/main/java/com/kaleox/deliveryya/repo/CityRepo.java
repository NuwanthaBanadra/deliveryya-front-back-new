package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.City;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CityRepo extends JpaRepository<City, Integer>, JpaSpecificationExecutor<City> {
}
