package com.kaleox.deliveryya.filters;

import com.kaleox.deliveryya.config.AccessNotGrantedException;
import com.kaleox.deliveryya.config.SecurityConfig;
import com.kaleox.deliveryya.controller.AccessController;
import com.kaleox.deliveryya.repo.ApiRepo;
import com.kaleox.deliveryya.repo.ApiRouteProjection;
import com.kaleox.deliveryya.service.AccessService;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ApiAccessControlInterceptor implements HandlerInterceptor {

    private static final String ANY_METHOD = "ANY";
    private static final int NO_API_MATCH = -1;

    private final ApiRepo apiRepo;
    private final AccessService accessService;

    private final AntPathMatcher pathMatcher = new AntPathMatcher();
    private final Map<String, Integer> requestApiIdCache = new ConcurrentHashMap<>();
    private volatile List<ApiRouteProjection> apiRouteCache = Collections.emptyList();

    @PostConstruct
    public void warmUp() {
        refreshApiRouteCache();
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (true) {
            return true;
        }

        String path = request.getServletPath();
        if ("/error".equals(path) || "/api/v1/access/get-access-details".equals(path) || isPublicPath(path)) {
            return true;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            return true;
        }

        Integer userId = extractUserId(authentication.getPrincipal());
        if (userId == null) {
            return true;
        }

        Integer apiId = resolveApiId(request.getMethod(), path);
        if (apiId == null) {
            return true;
        }

        Set<Integer> userApiIds = getOrLoadUserApiIds(request, userId);
        if (!userApiIds.contains(apiId)) {
            Map<String, String> errors = new HashMap<>();
            errors.put("path", path);
            errors.put("method", request.getMethod());
            throw new AccessNotGrantedException("Access Not Granted", errors);
        }

        return true;
    }

    private boolean isPublicPath(String path) {
        for (String pattern : SecurityConfig.PUBLIC_PATTERNS) {
            if (pathMatcher.match(pattern, path)) {
                return true;
            }
        }
        return false;
    }

    private Integer extractUserId(Object principal) {
        try {
            if (principal instanceof UserDetails userDetails) {
                return Integer.valueOf(userDetails.getUsername());
            }
            if (principal instanceof String value) {
                return Integer.valueOf(value);
            }
        } catch (NumberFormatException ignored) {
        }
        return null;
    }

    private Integer resolveApiId(String requestMethod, String path) {
        String cacheKey = requestMethod.toUpperCase(Locale.ROOT) + ":" + path;
        Integer cached = requestApiIdCache.get(cacheKey);
        if (cached != null) {
            return cached == NO_API_MATCH ? null : cached;
        }

        Integer matchedApiId = findBestApiId(requestMethod, path);
        if (matchedApiId == null) {
            refreshApiRouteCache();
            matchedApiId = findBestApiId(requestMethod, path);
        }

        requestApiIdCache.put(cacheKey, matchedApiId == null ? NO_API_MATCH : matchedApiId);
        return matchedApiId;
    }

    private Integer findBestApiId(String requestMethod, String path) {
        String method = requestMethod.toUpperCase(Locale.ROOT);
        return apiRouteCache.stream()
                .filter(route -> route.getMethodName() != null)
                .filter(route -> route.getName() != null)
                .filter(route -> {
                    String routeMethod = route.getMethodName().toUpperCase(Locale.ROOT);
                    return routeMethod.equals(method) || routeMethod.equals(ANY_METHOD);
                })
                .filter(route -> pathMatcher.match(route.getName(), path))
                .max(Comparator.comparingInt(route -> route.getName().length()))
                .map(ApiRouteProjection::getId)
                .orElse(null);
    }

    private void refreshApiRouteCache() {
        apiRouteCache = apiRepo.findAllApiRoutes();
        requestApiIdCache.clear();
    }

    private Set<Integer> getOrLoadUserApiIds(HttpServletRequest request, Integer userId) {
        HttpSession session = request.getSession(false);
        String sessionKey = AccessController.SESSION_API_IDS_PREFIX + userId;

        if (session != null) {
            Object cached = session.getAttribute(sessionKey);
            if (cached instanceof Set<?> set) {
                return set.stream()
                        .map(this::toInteger)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
            }
            if (cached instanceof Collection<?> collection) {
                return collection.stream()
                        .map(this::toInteger)
                        .filter(Objects::nonNull)
                        .collect(Collectors.toSet());
            }
        }

        Set<Integer> accessIds = accessService.getAccessDetailsByUser(userId);
        Set<Integer> apiIds = accessService.getFullAccessDetailsByUser(new ArrayList<>(accessIds));

        HttpSession writableSession = session != null ? session : request.getSession(true);
        writableSession.setAttribute(AccessController.SESSION_ACCESS_IDS_PREFIX + userId, accessIds);
        writableSession.setAttribute(sessionKey, apiIds);
        return apiIds;
    }

    private Integer toInteger(Object value) {
        if (value instanceof Integer number) {
            return number;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return value == null ? null : Integer.valueOf(value.toString());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
