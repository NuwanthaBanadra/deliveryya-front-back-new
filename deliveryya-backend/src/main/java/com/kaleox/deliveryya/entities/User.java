package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "first_name", nullable = false, length = 45)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 45)
    private String lastName;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(name = "nic", length = 20)
    private String nic;

    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @Column(name = "profile_img", nullable = true, length = 150)
    private String profileImg;

    @Column(name = "password", nullable = false, length = 100)
    private String password;

    @ColumnDefault("1")
    @Column(name = "isActive", nullable = false)
    private Boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "verification_status_id", nullable = false)
    private VerificationStatus verificationStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gender_id")
    private Gender gender;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_role_id", nullable = false)
    private UserRole userRole;

    @ColumnDefault("0")
    @Column(name = "email_verified", nullable = false)
    private Boolean emailVerified = false;

    @ColumnDefault("0")
    @Column(name = "has_market", nullable = false)
    private Boolean hasMarket = false;

    @ColumnDefault("0"
    )
    @Column(name = "isEmployee", nullable = false)
    private Boolean isEmployee = false;

    @ColumnDefault("0")
    @Column(name = "isDeleted", nullable = false)
    private Boolean isDeleted = false;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
    @CreatedBy
    @Column(updatable = false)
    private String createdBy;
    @LastModifiedBy
    private String updatedBy;

}