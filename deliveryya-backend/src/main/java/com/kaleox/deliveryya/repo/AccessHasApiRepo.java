package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Access;
import com.kaleox.deliveryya.entities.AccessHasApi;
import com.kaleox.deliveryya.entities.Api;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccessHasApiRepo extends JpaRepository<AccessHasApi, Integer> {
    List<AccessHasApi> findAllByAccess(Access access);

    List<AccessHasApi> findAllByAccess_Id(Integer accessId);

    Page<AccessHasApi> findAllByAccess_Id(Integer accessId, Pageable pageable);

    List<AccessHasApi> findAllByAccess_IdAndApi_IdIn(Integer accessId, List<Integer> apiIds);

    List<AccessHasApi> findAllByAccess_IdIn(List<Integer> accessIds);

    List<AccessHasApi> findAllByAccessAndApi(Access access, Api api);

    Optional<AccessHasApi> findByAccessAndApi(Access access, Api api);
}
