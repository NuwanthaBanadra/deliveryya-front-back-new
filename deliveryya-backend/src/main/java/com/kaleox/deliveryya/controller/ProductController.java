package com.kaleox.deliveryya.controller;

import com.kaleox.deliveryya.dto.ForceDeleteConfirmDto;
import com.kaleox.deliveryya.dto.ForceDeletePreviewDto;
import com.kaleox.deliveryya.dto.ProductDto;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.SizeDto;
import com.kaleox.deliveryya.dto.UnitDto;
import com.kaleox.deliveryya.dto.customDto.SetBrandDto;
import com.kaleox.deliveryya.dto.customDto.SetCategoryDto;
import com.kaleox.deliveryya.dto.customDto.SetProductsDto;
import com.kaleox.deliveryya.dto.customDto.SetSizeDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBrandDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCategoryDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedProductDto;
import com.kaleox.deliveryya.service.ProductService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    @PostMapping("/set-product")
    public ResponseEntity<ResponseDto<Void>> setProduct(@Valid @RequestBody SetProductsDto setProductsDto) {

        return ResponseEntity.ok(productService.setProduct(setProductsDto));
    }

    @PostMapping("/update-product")
    public ResponseEntity<ResponseDto<Void>> updateProduct(@Valid @RequestBody ProductDto productDto) {

        return ResponseEntity.ok(productService.updateProduct(productDto));
    }

    @GetMapping("/get-products-by-id")
    public ResponseEntity<ResponseDto<ProductDto>> getProductsById(@RequestParam @NotNull(message = "Product Id must be Provided") Integer id) {
        // Implementation goes here
        return ResponseEntity.ok(productService.getProductsById(id));
    }

    @PostMapping("/get-brands")
    public ResponseEntity<ResponseDto<PaginatedBrandDto>> getBrands(@RequestBody @Valid PaginatedBrandDto paginatedBrandDto) {

        return ResponseEntity.ok(productService.getBrands(paginatedBrandDto));
    }

    @PostMapping("/get-categories")
    public ResponseEntity<ResponseDto<PaginatedCategoryDto>> getCategories(@RequestBody @Valid PaginatedCategoryDto paginatedCategoryDto) {

        return ResponseEntity.ok(productService.getCategories(paginatedCategoryDto));
    }

    @PostMapping("/set-brand")
    public ResponseEntity<ResponseDto<Void>> setBrand(@RequestBody @Valid SetBrandDto setBrandDto) {

        return ResponseEntity.ok(productService.setBrand(setBrandDto));
    }

    @PostMapping("/set-category")
    public ResponseEntity<ResponseDto<Void>> setCategory(@RequestBody @Valid SetCategoryDto setCategoryDto) {

        return ResponseEntity.ok(productService.setCategory(setCategoryDto));
    }

    @DeleteMapping("/delete-brand")
    public ResponseEntity<ResponseDto<Void>> deleteBrand(@RequestParam @NotNull(message = "Brand Id must be provided") Integer id) {

        return ResponseEntity.ok(productService.deleteBrand(id));
    }

    @DeleteMapping("/delete-category")
    public ResponseEntity<ResponseDto<Void>> deleteCategory(@RequestParam @NotNull(message = "Category Id must be provided") Integer id) {

        return ResponseEntity.ok(productService.deleteCategory(id));
    }

    @PutMapping("/update-brand-status")
    public ResponseEntity<ResponseDto<Void>> updateBrandStatus(@RequestParam @NotNull(message = "Brand Id must be provided") Integer id,
                                                               @RequestParam @NotNull(message = "isActive must be provided") Boolean isActive) {

        return ResponseEntity.ok(productService.updateBrandStatus(id, isActive));
    }

    @PutMapping("/update-category-status")
    public ResponseEntity<ResponseDto<Void>> updateCategoryStatus(@RequestParam @NotNull(message = "Category Id must be provided") Integer id,
                                                                  @RequestParam @NotNull(message = "isActive must be provided") Boolean isActive) {

        return ResponseEntity.ok(productService.updateCategoryStatus(id, isActive));
    }

    @PostMapping("/get-products")
    public ResponseEntity<ResponseDto<PaginatedProductDto>> getProducts(@RequestBody @Valid PaginatedProductDto paginatedProductDto) {

        return ResponseEntity.ok(productService.getPaginatedProducts(paginatedProductDto));
    }

    @GetMapping("/get-units")
    public ResponseEntity<ResponseDto<List<UnitDto>>> getUnits() {

        return ResponseEntity.ok(productService.getUnits());
    }

    @GetMapping("/get-sizes")
    public ResponseEntity<ResponseDto<List<SizeDto>>> getSizes(@RequestParam @NotNull Integer marketId) {
        return ResponseEntity.ok(productService.getSizes(marketId));
    }

    @PostMapping("/set-size")
    public ResponseEntity<ResponseDto<SizeDto>> setSize(@RequestBody @Valid SetSizeDto dto) {
        return ResponseEntity.ok(productService.setSize(dto));
    }

    @PutMapping("/update-size")
    public ResponseEntity<ResponseDto<SizeDto>> updateSize(
            @RequestParam @NotNull Integer id,
            @RequestBody @Valid SetSizeDto dto) {
        return ResponseEntity.ok(productService.updateSize(id, dto));
    }

    @DeleteMapping("/delete-product-by-id")
    public ResponseEntity<ResponseDto<Void>> deleteProductById(@RequestParam @NotNull Integer id) {

        return ResponseEntity.ok().body(ResponseDto.<Void>builder()
                .message("Success")
                .desc(productService.deleteProductById(id))
                .build());
    }

    @PutMapping("/update-product-status")
    public ResponseEntity<ResponseDto<Void>> updateProductStatus(@RequestParam @NotNull Integer productId,
                                                                 @RequestParam @NotNull Boolean isActive) {
        return ResponseEntity.ok(ResponseDto.<Void>builder()
                .message("Success")
                .desc(productService.updateProductStatus(productId, isActive))
                .build());
    }

    @PutMapping("/set-default-image")
    public ResponseEntity<ResponseDto<Void>> setDefaultImage(@RequestParam @NotNull Integer productImageId) {
        return ResponseEntity.ok(productService.setDefaultProductImage(productImageId));
    }

    @GetMapping("/preview-force-delete-product")
    public ResponseEntity<ResponseDto<ForceDeletePreviewDto>> previewForceDeleteProduct(@RequestParam @NotNull Integer productId) {
        return ResponseEntity.ok(productService.previewForceDeleteProduct(productId));
    }

    @DeleteMapping("/force-delete-product")
    public ResponseEntity<ResponseDto<Void>> forceDeleteProduct(@Valid @RequestBody ForceDeleteConfirmDto dto) {
        return ResponseEntity.ok(productService.forceDeleteProduct(dto));
    }

    @GetMapping("/preview-force-delete-category")
    public ResponseEntity<ResponseDto<ForceDeletePreviewDto>> previewForceDeleteCategory(@RequestParam @NotNull Integer categoryId) {
        return ResponseEntity.ok(productService.previewForceDeleteCategory(categoryId));
    }

    @DeleteMapping("/force-delete-category")
    public ResponseEntity<ResponseDto<Void>> forceDeleteCategory(@Valid @RequestBody ForceDeleteConfirmDto dto) {
        return ResponseEntity.ok(productService.forceDeleteCategory(dto));
    }

    @GetMapping("/preview-force-delete-brand")
    public ResponseEntity<ResponseDto<ForceDeletePreviewDto>> previewForceDeleteBrand(@RequestParam @NotNull Integer brandId) {
        return ResponseEntity.ok(productService.previewForceDeleteBrand(brandId));
    }

    @DeleteMapping("/force-delete-brand")
    public ResponseEntity<ResponseDto<Void>> forceDeleteBrand(@Valid @RequestBody ForceDeleteConfirmDto dto) {
        return ResponseEntity.ok(productService.forceDeleteBrand(dto));
    }
}