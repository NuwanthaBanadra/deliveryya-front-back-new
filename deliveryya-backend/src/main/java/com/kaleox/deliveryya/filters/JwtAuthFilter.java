package com.kaleox.deliveryya.filters;

import com.kaleox.deliveryya.config.SecurityConfig;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.service.AuthService;
import com.kaleox.deliveryya.utill.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Date;

@Slf4j
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    @Autowired
    AuthService userDetailsService;

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        String path = request.getServletPath();

        // Use AntPathMatcher to correctly check wildcard patterns
        for (String pattern : SecurityConfig.PUBLIC_PATTERNS) {
            if (pathMatcher.match(pattern, path)) {
                filterChain.doFilter(request, response);
                return;
            }
        }

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);

            try {
                response.setHeader("Access-Control-Expose-Headers", "x-token");

                Claims claims = JwtUtil.parse(token).getBody();
                String email = claims.getSubject();

                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                User user = userDetailsService.getUserByEmail(email);
                if (!claims.get("roleId", Integer.class).equals(user.getUserRole().getId())) {
                    response.setHeader("x-token", JwtUtil.regenerateJwtToken(claims, (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()), user.getUserRole().getId()));
                }

                Date issuedAt = claims.getIssuedAt();
                Date expiration = claims.getExpiration();
                long originalLifetimeMs = expiration.getTime() - issuedAt.getTime();

                Instant halfLifePoint = issuedAt.toInstant().plusMillis(originalLifetimeMs / 2);

                Instant now = Instant.now();
                if (now.isAfter(halfLifePoint) && now.isBefore(expiration.toInstant())) {
                    String newToken = JwtUtil.regenerateJwtToken(claims, (claims.getExpiration().getTime() - claims.getIssuedAt().getTime()), user.getUserRole().getId());
                    response.setHeader("x-token", newToken);
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (ExpiredJwtException e) {
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Token expired");
                return;
            } catch (MalformedJwtException e) {
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid token format");
                return;
            } catch (SignatureException e) {
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid Authorization token");
                return;
            } catch (JwtException e) {
                sendErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid or expired token");
                return;
            }
        }

        // Allow request to continue. If no authentication is set,
        // Spring Security will handle it based on SecurityConfig.
        filterChain.doFilter(request, response);
    }

    private void sendErrorResponse(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\": \"" + message + "\"}");
    }
}
