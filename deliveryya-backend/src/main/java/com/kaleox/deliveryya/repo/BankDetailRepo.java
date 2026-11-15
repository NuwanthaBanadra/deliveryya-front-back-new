package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.BankDetail;
import com.kaleox.deliveryya.entities.Market;
import com.kaleox.deliveryya.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BankDetailRepo extends JpaRepository<BankDetail, Integer>, JpaSpecificationExecutor<BankDetail> {

    List<BankDetail> findByUser(User user);

    Optional<BankDetail> findByIdAndIsDeletedFalse(Integer id);

    Optional<BankDetail> findByIdAndUser_IdAndIsDeletedFalse(Integer id, Integer userId);

    List<BankDetail> findAllByUser_IdAndIsDeletedFalse(Integer userId);

    List<BankDetail> findAllByIsDeletedFalse();
}

