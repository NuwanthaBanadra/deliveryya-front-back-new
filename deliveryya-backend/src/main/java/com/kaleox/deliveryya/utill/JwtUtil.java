package com.kaleox.deliveryya.utill;

import com.kaleox.deliveryya.dto.EmailDto;
import com.kaleox.deliveryya.entities.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    private static final long EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
    private static SecretKey KEY;
    private static SecretKey EMAIL_KEY;
    private static String SECRET;
    private static String EMAIL_SECRET;
//    private static final SecretKey KEY = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET));

    public static String createAccessToken(User user, int[] accessIds) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + (user.getUserRole().getSessionDuration() != null ? user.getUserRole().getSessionDuration() * 60000 : EXPIRATION_MS));
//        Date expiry = new Date(now.getTime() +(user.getUserRole().getSessionDuration() * 60000));

        return Jwts.builder()
                .setSubject(user.getEmail())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .addClaims(Map.ofEntries(
                        Map.entry("userId", user.getId()),
                        Map.entry("email", user.getEmail()),
                        Map.entry("roleId", user.getUserRole().getId()),
                        Map.entry("roleLevel", user.getUserRole().getLevel()),
                        Map.entry("isVerified", user.getVerificationStatus().getId()),
                        Map.entry("isEmployee", user.getIsEmployee()),
                        Map.entry("email_verified", user.getEmailVerified()),
                        Map.entry("has_market", user.getHasMarket()),
                        Map.entry("accessIds", accessIds),
                        Map.entry("firstName", user.getFirstName()),
                        Map.entry("lastName", user.getLastName())
                ))

                .signWith(KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    public static Jws<Claims> parse(String token) throws JwtException {
        return Jwts.parserBuilder().setSigningKey(KEY).build().parseClaimsJws(token);
    }

    public static Jws<Claims> parseEmailJwtToken(String token) throws JwtException {
        return Jwts.parserBuilder().setSigningKey(EMAIL_KEY).build().parseClaimsJws(token);
    }

//    public static Long extractUserId(String token) {
//        return Long.valueOf(parse(token).getBody().get("userId").toString());
//    }
//
//    public static String extractEmail(String token) {
//        return parse(token).getBody().getSubject();
//    }
//
//    public static boolean isTokenExpired(String token) {
//        Date expiration = parse(token).getBody().getExpiration();
//        return expiration.before(new Date());
//    }

//    public static boolean validateToken(String token, Long expectedUserId) {
//        try {
//            Claims claims = parse(token).getBody();
//            return claims.getSubject().equals(String.valueOf(expectedUserId)) && !isTokenExpired(token);
//        } catch (JwtException e) {
//            return false;
//        }
//    }

    public static String regenerateJwtToken(Map<String, Object> claims, Long expireIn, Integer userRoleId) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expireIn);

        return Jwts.builder()
                .setSubject(claims.get("email").toString())
                .setIssuedAt(now)
                .setExpiration(expiry)
                .addClaims(Map.of(
                        "userId", claims.get("userId"),
                        "email", claims.get("email"),
                        "roleId", userRoleId,
                        "isVerified", claims.get("isVerified"),
                        "isEmployee", claims.get("isEmployee"),
                        "email_verified", claims.get("email_verified"),
                        "has_market", claims.get("has_market"),
                        "accessIds", claims.get("accessIds"),
                        "firstName", claims.get("firstName"),
                        "lastName", claims.get("lastName")
                ))
                .signWith(KEY, SignatureAlgorithm.HS256)
                .compact();
    }

    public static String generateResetPasswordToken(String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 1000 * 60 * 5);

        return Jwts.builder()
                .setSubject("Access details - this token is only valid for 24 hours and any attempt of misuse will lead to account suspension and legal actions")
                .setIssuedAt(now)
                .setExpiration(expiry)
                .addClaims(Map.of("email", email))
                .signWith(KEY, SignatureAlgorithm.HS256).compact();
    }

    public String generateEmailValidationToken(EmailDto emailDto) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 1000 * 60 * 15);

        return Jwts.builder().setSubject(emailDto.getEmail()).setIssuedAt(now).setExpiration(expiry).signWith(EMAIL_KEY, SignatureAlgorithm.HS256).compact();

    }

    public String generateAccessDetail(Map<String, Object> claims) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + 1000 * 60 * 60 * 24);

        return Jwts.builder()
                .setSubject("Access details - this token is only valid for 24 hours and any attempt of misuse will lead to account suspension and legal actions")
                .setIssuedAt(now)
                .setExpiration(expiry)
                .addClaims(claims)
                .signWith(KEY, SignatureAlgorithm.HS256).compact();

    }

    @Value("${app.jwt.secret}")
    public void setSecret(String secret) {
        if (SECRET != null) {
            return;
        }
        JwtUtil.SECRET = secret;
        JwtUtil.KEY = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    @Value("${app.email.verify.secret}")
    public void setEmailSecret(String secret) {
        if (EMAIL_SECRET != null) {
            return;
        }
        JwtUtil.EMAIL_SECRET = secret;
        JwtUtil.EMAIL_KEY = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

}
