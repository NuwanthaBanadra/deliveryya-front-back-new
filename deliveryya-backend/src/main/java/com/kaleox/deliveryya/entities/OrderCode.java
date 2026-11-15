package com.kaleox.deliveryya.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "order_codes", uniqueConstraints = @UniqueConstraint(name = "uk_order_codes_code", columnNames = "code"))
public class OrderCode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "users_id", nullable = false)
    private User users;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_code_request")
    private OrderCodeRequest orderCodeRequest;

    @ColumnDefault("0")
    @Column(name = "field")
    private Boolean field;
    @OneToOne(mappedBy = "orderCode")
    private Order order;


}