package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.AccessToken;
import com.kaleox.deliveryya.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccessTokenRepo extends JpaRepository<AccessToken, Integer> {
    Optional<AccessToken> findByUsersAndTokenType_Id(User users, Integer tokenTypeId);

    List<AccessToken> findAllByUsersAndTokenType_IdAndDeviceIdIsNull(User users, Integer tokenTypeId);

    List<AccessToken> findAllByUsersAndTokenType_IdAndDeviceId(User users, Integer tokenTypeId, String deviceId);

    List<AccessToken> findAllByUsers(User users);

    @Query("select count(at) from AccessToken at where at.users.id = :userId")
    long countByUsersId(@Param("userId") Integer userId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "DELETE FROM access_tokens WHERE users_id = :userId", nativeQuery = true)
    void deleteByUsersId(@Param("userId") Integer userId);
}