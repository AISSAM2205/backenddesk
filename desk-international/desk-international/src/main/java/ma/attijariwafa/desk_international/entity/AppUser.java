// entity/AppUser.java
package ma.attijariwafa.desk_international.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "app_user")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;  // ex: "m.ouadi"

    @Email @NotBlank
    @Column(name = "email", nullable = false, unique = true, length = 100)
    private String email;  // ex: "m.ouadi@attijariwafa.com"

    // Hash BCrypt — JAMAIS retourné dans les réponses HTTP
    // BCrypt encode "AWB2025!" → "$2a$12$..."
    @Column(name = "password_hash", nullable = false, length = 60)
    private String passwordHash;

    // TRADER : peut importer CSV et consulter
    // ADMIN : accès complet y compris gestion users
    // READONLY : consultation uniquement (ex: direction)
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "full_name", length = 100)
    private String fullName;  // ex: "OUADI MOHAMED AMINE"

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist void onPersist() { this.createdAt = LocalDateTime.now(); }
}