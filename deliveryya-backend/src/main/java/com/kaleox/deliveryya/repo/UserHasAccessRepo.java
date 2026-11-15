package com.kaleox.deliveryya.repo;

import com.kaleox.deliveryya.entities.Access;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.entities.UserHasAccess;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserHasAccessRepo extends JpaRepository<UserHasAccess, Integer> {
    Optional<UserHasAccess> findByUsersAndAccess(User users, Access access);

    List<UserHasAccess> findByAccess(Access access);

    List<UserHasAccess> findByUsers_id(Integer usersId);

    void deleteAllByUsers(User users);

    List<UserHasAccess> findAllByUsers(User users);

    @Query(value = """
            select distinct u
            from UserHasAccess uha
            join uha.users u
            where (:accessId is null or uha.access.id = :accessId)
              and (:expired is null or :expired = false or (uha.exp is not null and uha.exp < current_timestamp))
              and (:notExpired is null or :notExpired = false or (uha.exp is null or uha.exp >= current_timestamp))
              and (:expiredFrom is null or uha.exp >= :expiredFrom)
              and (:expiredAt is null or uha.exp <= :expiredAt)
            order by u.id asc
            """,
            countQuery = """
            select count(distinct u.id)
            from UserHasAccess uha
            join uha.users u
            where (:accessId is null or uha.access.id = :accessId)
              and (:expired is null or :expired = false or (uha.exp is not null and uha.exp < current_timestamp))
              and (:notExpired is null or :notExpired = false or (uha.exp is null or uha.exp >= current_timestamp))
              and (:expiredFrom is null or uha.exp >= :expiredFrom)
              and (:expiredAt is null or uha.exp <= :expiredAt)
            """)
    Page<User> findDistinctGrantedUsers(@Param("accessId") Integer accessId,
                                        @Param("expired") Boolean expired,
                                        @Param("notExpired") Boolean notExpired,
                                        @Param("expiredFrom") LocalDateTime expiredFrom,
                                        @Param("expiredAt") LocalDateTime expiredAt,
                                        Pageable pageable);
}