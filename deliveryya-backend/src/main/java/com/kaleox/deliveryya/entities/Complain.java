package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@EntityListeners(AuditingEntityListener.class)
@Table(name = "complains")
public class Complain {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "complain", nullable = false, columnDefinition = "TEXT")
    private String complain;

    @Size(max = 100)
    @NotNull
    @Column(name = "subject", nullable = false, length = 100)
    private String subject;

    @NotNull
    @Column(name = "is_solve", nullable = false,columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isSolve;

    @Column(name = "response", columnDefinition = "TEXT")
    private String response;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complain_type_id", nullable = false)
    private ComplainType complainType;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complain_status_id", nullable = false)
    private ComplainStatus complainStatus;

    @NotNull
    @Column(name = "code", nullable = false)
    private String code;


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