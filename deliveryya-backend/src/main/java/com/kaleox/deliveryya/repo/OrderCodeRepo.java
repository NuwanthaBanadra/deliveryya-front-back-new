package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.OrderCode;
import com.kaleox.deliveryya.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderCodeRepo extends JpaRepository<OrderCode, Integer>, JpaSpecificationExecutor<OrderCode> {


    List<OrderCode> findByUsersOrderByCodeDesc(User users);

    List<OrderCode> findByCode(String code);

    boolean existsByCode(String code);

    List<OrderCode> findByFieldAndUsers_id(Boolean field, Integer usersId);

    List<OrderCode> findByUsers_id(Integer usersId);

    List<OrderCode> findByOrderCodeRequest_Id(Integer orderCodeRequestId);

    List<OrderCode> findByUsers(User users);

    List<OrderCode> findByFieldAndUsers(Boolean field, User users);
}