package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import lombok.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "bank_details")
public class BankDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", nullable = false, length = 45)
    private String name;

    @Column(name = "acc_number", nullable = false, length = 20)
    private String accNumber;

    @Builder.Default
    @Column(name = "balance", nullable = false, columnDefinition = "DOUBLE DEFAULT 0")
    private Double balance = 0.0;

    @Column(name = "branch", nullable = false, length = 45)
    private String branch;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bank_id", nullable = false)
    private Bank bank;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "is_active", nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive = true;

    @Column(name = "is_deleted", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isDeleted = false;

    @Column(name = "is_company", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isCompany = false;

}
