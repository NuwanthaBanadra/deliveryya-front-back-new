package com.kaleox.deliveryya.config;

import com.kaleox.deliveryya.filters.ApiAccessControlInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final ApiAccessControlInterceptor apiAccessControlInterceptor;

    @Value("${app.upload.path}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**", "/static/uploads/**")
                .addResourceLocations(resolveUploadLocations());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(apiAccessControlInterceptor);
    }

    private String[] resolveUploadLocations() {
        Set<String> resourceLocations = new LinkedHashSet<>();
        resourceLocations.add(toResourceLocation(uploadPath));
//        resourceLocations.add(toResourceLocation("src/main/resources/static/uploads"));
        return resourceLocations.toArray(String[]::new);
    }

    private String toResourceLocation(String path) {
        Path absoluteUploadPath = Paths.get(path).toAbsolutePath().normalize();
        return absoluteUploadPath.toUri().toString();
    }
}
