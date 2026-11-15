package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Api;
import com.kaleox.deliveryya.entities.ApiFeature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApiFeatureRepo extends JpaRepository<ApiFeature, Integer> {
    List<ApiFeature> findAllByApi(Api api);

    // Additional query methods can be added as needed
}

