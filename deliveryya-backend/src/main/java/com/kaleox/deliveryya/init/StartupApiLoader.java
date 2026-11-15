//package com.kaleox.deliveryya.init;
//
//import com.kaleox.deliveryya.entities.Api;
//import com.kaleox.deliveryya.entities.ApiMethod;
//import com.kaleox.deliveryya.repo.ApiMethodRepo;
//import com.kaleox.deliveryya.repo.ApiRepo;
//import org.springframework.web.bind.annotation.RequestMethod;
//import org.springframework.web.method.HandlerMethod;
//import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
//import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
//import org.springframework.web.servlet.mvc.condition.PathPatternsRequestCondition;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.core.io.ClassPathResource;
//import org.springframework.boot.context.event.ApplicationReadyEvent;
//import org.springframework.jdbc.core.JdbcTemplate;
//import org.springframework.stereotype.Component;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.io.BufferedReader;
//import java.io.InputStreamReader;
//import java.nio.charset.StandardCharsets;
//import java.util.*;
//import java.util.stream.Collectors;
//import org.springframework.context.ApplicationContext;
//import org.springframework.context.event.EventListener;
//import org.springframework.messaging.handler.annotation.MessageMapping;
//
///**
// * Startup component that ensures `apis` table is populated from a simple CSV resource
// * and that `api_features` rows are re-attached to new API ids when possible.
// *
// * Behavior:
// * - Read desired APIs from classpath resource `/apis.csv` (optional). If not present, falls
// *   back to the hard-coded list in `getDefaultApis()`.
// * - Before truncating `apis`, it reads existing api_features joined with apis to capture
// *   a mapping of old-api-name -> list of feature row ids and other columns.
// * - Truncates `apis` table and inserts desired apis (so IDs will be regenerated).
// * - For each captured feature set: if api with same name exists in the new list, update
// *   those api_features rows to point to the new api id. If the api name no longer exists,
// *   those api_features rows are removed.
// *
// * Usage:
// * - To change the desired APIs without recompiling, add `src/main/resources/apis.csv`
// *   with lines: name,description (header optional). Example:
// *     GET_PRODUCTS,Get products endpoint
// *     CREATE_ORDER,Create order endpoint
// */
//@Component
//public class StartupApiLoader {
//
//    @Autowired
//    private JdbcTemplate jdbcTemplate;
//
//    @Autowired
//    private ApiRepo apiRepo;
//
//    @Autowired
//    private ApiMethodRepo apiMethodRepo;
//
//    @Autowired
//    private RequestMappingHandlerMapping requestMappingHandlerMapping;
//
//    @EventListener(ApplicationReadyEvent.class)
//    @Transactional
//    public void init() {
//        List<ApiSeed> desired = loadDesiredApis();
//
//        // 1) capture existing features grouped by api name
//        String joinSql = "SELECT f.id AS feature_id, f.* , a.name AS api_name FROM api_features f JOIN apis a ON f.api_id = a.id";
//        List<Map<String, Object>> rows;
//        try {
//            rows = jdbcTemplate.queryForList(joinSql);
//        } catch (Exception ex) {
//            // If api_features table does not exist or join fails, just proceed with insert
//            rows = Collections.emptyList();
//        }
//
//        Map<String, List<Integer>> oldFeatureIdsByApiName = new HashMap<>();
//        for (Map<String, Object> r : rows) {
//            Object apiNameObj = r.get("api_name");
//            Object featureIdObj = r.get("feature_id");
//            if (apiNameObj != null && featureIdObj != null) {
//                String apiName = apiNameObj.toString();
//                Integer featureId = ((Number) featureIdObj).intValue();
//                oldFeatureIdsByApiName.computeIfAbsent(apiName, k -> new ArrayList<>()).add(featureId);
//            }
//        }
//
//        // 2) forcefully truncate api_methods then apis
//        forceTruncate("api_methods");
//        forceTruncate("apis");
//
//        // 3) Create one ApiMethod per unique HTTP method (normalization)
//        Map<String, ApiMethod> methodsByName = new HashMap<>();
//        Set<String> uniqueMethods = new HashSet<>();
//        for (ApiSeed seed : desired) {
//            uniqueMethods.add(seed.methodName);
//        }
//
//        for (String methodName : uniqueMethods) {
//            ApiMethod method = new ApiMethod();
//            method.setName(methodName);
//            ApiMethod saved = apiMethodRepo.save(method);
//            methodsByName.put(methodName, saved);
//        }
//
//        // 4) Insert desired apis, reusing ApiMethod IDs
//        Map<String, Integer> newIdByName = new HashMap<>();
//        for (ApiSeed seed : desired) {
//            Api api = new Api();
//            api.setName(seed.name);
//            api.setDesc(seed.desc);
//            api.setApiMethod(methodsByName.get(seed.methodName));
//
//            Api saved = apiRepo.save(api);
//            newIdByName.put(saved.getName(), saved.getId());
//        }
//
//        // 5) reassign or delete features based on api name mapping
//        for (Map.Entry<String, List<Integer>> e : oldFeatureIdsByApiName.entrySet()) {
//            String oldApiName = e.getKey();
//            List<Integer> featureIds = e.getValue();
//            Integer newApiId = newIdByName.get(oldApiName);
//            if (newApiId != null) {
//                // update api_id for these features
//                String idsCsv = featureIds.stream().map(String::valueOf).collect(Collectors.joining(","));
//                String updateSql = "UPDATE api_features SET api_id = " + newApiId + " WHERE id IN (" + idsCsv + ")";
//                jdbcTemplate.update(updateSql);
//            } else {
//                // api was removed -> delete the features
//                String idsCsv = featureIds.stream().map(String::valueOf).collect(Collectors.joining(","));
//                String deleteSql = "DELETE FROM api_features WHERE id IN (" + idsCsv + ")";
//                jdbcTemplate.update(deleteSql);
//            }
//        }
//    }
//
//    private List<ApiSeed> loadDesiredApis() {
//        // try to read classpath /apis.csv
//        try {
//            ClassPathResource r = new ClassPathResource("apis.csv");
//            if (r.exists()) {
//                try (BufferedReader br = new BufferedReader(new InputStreamReader(r.getInputStream(), StandardCharsets.UTF_8))) {
//                    List<ApiSeed> list = new ArrayList<>();
//                    String line;
//                    while ((line = br.readLine()) != null) {
//                        line = line.trim();
//                        if (line.isEmpty() || line.startsWith("#") ) continue;
//                        String[] parts = line.split(",", 3);
//                        String name = parts[0].trim();
//                        String desc = parts.length > 1 ? parts[1].trim() : "";
//                        String methodName = parts.length > 2 ? parts[2].trim() : "GET";
//                        list.add(new ApiSeed(name, desc, methodName));
//                    }
//                    if (!list.isEmpty()) return list;
//                }
//            }
//        } catch (Exception ignored) {
//        }
//
//        // If no CSV provided, discover controllers and mappings automatically
//        List<ApiSeed> discovered = discoverApisFromMappings();
//        if (!discovered.isEmpty()) return discovered;
//
//        return getDefaultApis();
//    }
//
//    private List<ApiSeed> discoverApisFromMappings() {
//        List<ApiSeed> apis = new ArrayList<>();
//        try {
//            Map<RequestMappingInfo, HandlerMethod> handlerMethods = requestMappingHandlerMapping.getHandlerMethods();
//
//            for (Map.Entry<RequestMappingInfo, HandlerMethod> e : handlerMethods.entrySet()) {
//                RequestMappingInfo info = e.getKey();
//                HandlerMethod hm = e.getValue();
//                Set<String> patterns = Collections.emptySet();
//                PathPatternsRequestCondition pathPatternsCondition = info.getPathPatternsCondition();
//                if (pathPatternsCondition != null) {
//                    patterns = pathPatternsCondition.getPatternValues();
//                }
//                Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
//
//                String description = hm.getBeanType().getSimpleName() + "#" + hm.getMethod().getName();
//
//                for (String path : patterns) {
//                    if (methods.isEmpty()) {
//                        apis.add(new ApiSeed(path, description, "ANY"));
//                    } else {
//                        for (RequestMethod rm : methods) {
//                            apis.add(new ApiSeed(path, description, rm.name()));
//                        }
//                    }
//                }
//            }
//
//            // Also discover WebSocket / MessageMapping endpoints
//            try {
//                ApplicationContext ctx = requestMappingHandlerMapping.getApplicationContext();
//                if (ctx != null) {
//                    String[] allBeans = ctx.getBeanDefinitionNames();
//                    for (String bn : allBeans) {
//                        Class<?> type = ctx.getType(bn);
//                        if (type == null) continue;
//                        for (java.lang.reflect.Method m : type.getMethods()) {
//                            MessageMapping mm = m.getAnnotation(MessageMapping.class);
//                            if (mm != null) {
//                                String[] vals = mm.value();
//                                for (String v : vals) {
//                                    String path = v.startsWith("/") ? v : ("/" + v);
//                                    apis.add(new ApiSeed(path, type.getSimpleName() + "#" + m.getName(), "WEB_SOCKET"));
//                                }
//                            }
//                        }
//                    }
//                }
//            } catch (Exception ex) {
//                // ignore websocket discovery issues
//            }
//        } catch (Exception ex) {
//            // ignore discovery errors and return empty list
//        }
//        return apis;
//    }
//
//    private List<ApiSeed> getDefaultApis() {
//        // Minimal default list - adapt to your project
//        return Arrays.asList(
//                new ApiSeed("GET_PRODUCTS", "Get products endpoint", "GET"),
//                new ApiSeed("CREATE_ORDER", "Create order endpoint", "POST")
//        );
//    }
//
//    private void forceTruncate(String tableName) {
//        try {
//            jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=0");
//            jdbcTemplate.execute("TRUNCATE TABLE " + tableName);
//        } catch (Exception ex) {
//            try {
//                jdbcTemplate.execute("DELETE FROM " + tableName);
//            } catch (Exception ignore) {
//                // best-effort refresh: ignore and continue startup
//            }
//        } finally {
//            try {
//                jdbcTemplate.execute("SET FOREIGN_KEY_CHECKS=1");
//            } catch (Exception ignore) {
//            }
//        }
//    }
//
//    private record ApiSeed(String name, String desc, String methodName) {
//    }
//}
//
//
//
//
//
