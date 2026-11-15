package com.kaleox.deliveryya.service;

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
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public interface ProductService {
    ResponseDto<Void> setProduct(SetProductsDto setProductsDto);

    ResponseDto<ProductDto> getProductsById(Integer id);

    ResponseDto<PaginatedBrandDto> getBrands(@Valid PaginatedBrandDto paginatedProductDto);

    ResponseDto<PaginatedCategoryDto> getCategories(@Valid PaginatedCategoryDto paginatedProductDto);

    ResponseDto<PaginatedProductDto> getPaginatedProducts(@Valid PaginatedProductDto paginatedProductDto);

    ResponseDto<Void> updateProduct(@Valid ProductDto productDto);

    ResponseDto<List<UnitDto>> getUnits();

    ResponseDto<List<SizeDto>> getSizes(Integer marketId);

    ResponseDto<SizeDto> setSize(@Valid SetSizeDto dto);

    ResponseDto<SizeDto> updateSize(Integer id, @Valid SetSizeDto dto);

    ResponseDto<Void> setBrand(@Valid SetBrandDto setBrandDto);

    ResponseDto<Void> setCategory(@Valid SetCategoryDto setCategoryDto);

    ResponseDto<Void> deleteBrand(Integer brandId);

    ResponseDto<Void> deleteCategory(Integer categoryId);

    ResponseDto<Void> updateBrandStatus(Integer brandId, Boolean isActive);

    ResponseDto<Void> updateCategoryStatus(Integer categoryId, Boolean isActive);

    String deleteProductById(@Valid @NotNull @Min(0) Integer id);

    String updateProductStatus(@Valid @NotNull @Min(0) Integer productId,@Valid @NotNull Boolean isActive);

    ResponseDto<Void> setDefaultProductImage(Integer productImageId);

    ResponseDto<ForceDeletePreviewDto> previewForceDeleteProduct(@NotNull Integer productId);

    ResponseDto<Void> forceDeleteProduct(@Valid ForceDeleteConfirmDto dto);

    ResponseDto<ForceDeletePreviewDto> previewForceDeleteCategory(@NotNull Integer categoryId);

    ResponseDto<Void> forceDeleteCategory(@Valid ForceDeleteConfirmDto dto);

    ResponseDto<ForceDeletePreviewDto> previewForceDeleteBrand(@NotNull Integer brandId);

    ResponseDto<Void> forceDeleteBrand(@Valid ForceDeleteConfirmDto dto);
}
