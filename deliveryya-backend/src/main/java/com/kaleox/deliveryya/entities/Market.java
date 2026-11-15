package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
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
@Table(name = "markets")
public class Market {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Size(max = 45)
    @NotNull
    @Column(name = "name", nullable = false, length = 45)
    private String name;

    @Column(name = "location",length = 200)
    private String location;

    @Size(max = 100)
    @Column(name = "address", length = 100,nullable = false)
    private String address;

    @Size(max = 100)
    @Column(name = "logo_url", length = 150)
    private String logoUrl;

    @Size(max = 100)
    @Column(name = "cover_img_url", length = 150)
    private String coverImgUrl;

    @Size(max = 150)
    @NotNull
    @Column(name = "`desc`", nullable = false, length = 150)
    private String desc;

    @Size(max = 20)
    @NotNull
    @Column(name = "first_num", nullable = false, length = 20)
    private String firstNum;

    @Size(max = 20)
    @NotNull
    @Column(name = "second_num", nullable = false, length = 20)
    private String secondNum;

    @Size(max = 20)
    @NotNull
    @Column(name = "whats_app", nullable = false, length = 20)
    private String whatsApp;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "users_id", nullable = false)
    private User users;

    @Column(name = "info_message",columnDefinition = "TEXT")
    private String infoMessage;

    @NotNull
    @ColumnDefault("b'0'")
    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @NotNull
    @ColumnDefault("b'0'")
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "market_category_id", nullable = false)
    private MarketCategory marketCategory;

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
