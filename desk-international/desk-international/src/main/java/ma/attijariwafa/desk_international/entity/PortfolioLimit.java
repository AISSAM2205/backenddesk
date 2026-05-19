// entity/PortfolioLimit.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "portfolio_limit")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PortfolioLimit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nom du portefeuille : "PTF Trading" ou "PTF FCP"
    @NotBlank
    @Column(name = "portfolio_name", nullable = false, length = 50)
    private String portfolioName;

    // Limite en millions EUR
    // Dashboard row 5 : PTF Trading = 280M EUR
    // Dashboard row 6 : PTF FCP    = 50M EUR
    @Positive
    @Column(name = "limit_meur", nullable = false, precision = 10, scale = 2)
    private BigDecimal limitMeur;

    // Duration maximale autorisée (en années)
    // Commentaire Excel : "limit duration 7ans"
    @Column(name = "max_duration_years", precision = 4, scale = 2)
    private BigDecimal maxDurationYears = new BigDecimal("7.00");

    // EXPOSURE (280M EUR, 50M USD…) or TARGET (35M USD annual P&L)
    @Column(name = "limit_type", nullable = false, length = 20)
    private String limitType = "EXPOSURE";

    // EUR | USD — limitMeur holds the amount in this currency (in millions)
    @Column(name = "currency", length = 3)
    private String currency = "EUR";

    // Frontend key: EUROBONDS, CLN_MOROC, CLN_GCC, EGP_BILLS, MOROC, OCP, CLN, EGP
    @Column(name = "category", length = 30)
    private String category;

    // CSS color token for charts: "var(--eb)", "#9B3EEF", etc.
    @Column(name = "color_token", length = 40)
    private String colorToken;

    // Date d'entrée en vigueur de cette limite
    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    // FALSE = limite archivée (nouvelle limite l'a remplacée)
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist void onPersist() { this.createdAt = LocalDateTime.now(); }
}