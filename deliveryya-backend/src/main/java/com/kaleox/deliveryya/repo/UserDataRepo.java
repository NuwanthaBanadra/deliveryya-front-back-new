package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.UserData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserDataRepo extends JpaRepository<UserData, Integer> {
    List<UserData> findByUsers_Id(Integer usersId);

    Optional<UserData> findByIdAndUsers_Id(Integer id, Integer usersId);

    @Query("select count(ud) from UserData ud where ud.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM user_data WHERE users_id = :userId", nativeQuery = true)
    void deleteByUsersId(@Param("userId") Integer userId);
}
