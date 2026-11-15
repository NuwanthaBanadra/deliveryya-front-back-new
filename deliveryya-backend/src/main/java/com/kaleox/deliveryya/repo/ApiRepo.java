package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Api;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiRepo extends JpaRepository<Api, Integer>, JpaSpecificationExecutor<Api> {
    Optional<Api> findByName(String name);

    @Query("""
            select a.id as id, a.name as name, m.name as methodName
            from Api a
            join a.apiMethod m
            """)
    List<ApiRouteProjection> findAllApiRoutes();
}

