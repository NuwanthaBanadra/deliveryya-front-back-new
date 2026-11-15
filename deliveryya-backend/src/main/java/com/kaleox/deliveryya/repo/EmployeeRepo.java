package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Employee;
import com.kaleox.deliveryya.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepo extends JpaRepository<Employee, Integer> {
    Optional<Employee> findByUsers_Id(Integer usersId);

    Optional<Employee> findByUsers(User users);

    @Query("select count(e) from Employee e where e.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);
}