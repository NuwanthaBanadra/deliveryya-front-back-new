package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.*;
import com.kaleox.deliveryya.dto.customDto.SetBrandDto;
import com.kaleox.deliveryya.dto.customDto.SetCategoryDto;
import com.kaleox.deliveryya.dto.customDto.SetProductsDto;
import com.kaleox.deliveryya.dto.customDto.SetSizeDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBrandDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedCategoryDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedProductDto;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.ProductService;
import com.kaleox.deliveryya.service.specification.ProductSpec;
import com.kaleox.deliveryya.utill.FileStorageUtil;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.modelmapper.TypeToken;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ModelMapper modelMapper;
    private final ProductRepo productRepo;
    private final ProductImagesRepo productImagesRepo;
    private final StockRepo stockRepo;
    private final BrandRepo brandRepo;
    private final CategoryRepo categoryRepo;
    private final MarketRepo marketRepo;
    private final UnitRepo unitRepo;
    private final SizeRepo sizeRepo;
    private final FeedbackRepo feedbackRepo;
    private final MarketOrderItemRepo marketOrderItemRepo;
    private final FileStorageUtil fileStorageUtil;

    @Override
    public ResponseDto<Void> setProduct(SetProductsDto setProductsDto) {
        Map<String, String> err = new HashMap<>();

        Product product = modelMapper.map(setProductsDto.getProducts(), Product.class);
        product.setId(null);
        product.setIsActive(false);
        Integer categoryId = setProductsDto.getProducts().getCategory() == null
                ? null
                : setProductsDto.getProducts().getCategory().getId();
        if (categoryId == null) {
            throw new BusinessException("Product category is required.", Map.of("category", "Select a category for this product"));
        }
        product.setCategory(categoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Category not found with id: " + categoryId, null)));

        if (productRepo.findByCode(product.getCode()).isPresent()) {
            err.put("code", "Product already exists with this code");
        }
        if (productRepo.findByName(product.getName()).isPresent()) {
            err.put("name", "Product already exists with this name");
        }

        if (!err.isEmpty()) {
            throw new BusinessException("Failed to add this product.", err);
        }

        Product savedProduct = productRepo.save(product);

        // Save product images and mark the first image as default
        List<String> imageUrls = setProductsDto.getImageUrls() == null ? List.of() : setProductsDto.getImageUrls();
        for (int i = 0; i < imageUrls.size(); i++) {
            String imageUrl = imageUrls.get(i);

            // Validate and move image file to products directory
            if (imageUrl == null || imageUrl.trim().isEmpty()) {
                continue;
            }

            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            if (!fileStorageUtil.isImageFile(filename)) {
                throw new BusinessException("Only image files are allowed for products", Map.of("imageUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
            }

            String movedImageUrl = fileStorageUtil.moveFile(imageUrl, "products");
            if (movedImageUrl == null) {
                throw new BusinessException("Failed to process image file", Map.of("imageUrl", "Could not process the image file"));
            }

            ProductImage productImage = new ProductImage();
            productImage.setProducts(savedProduct);
            productImage.setUrl(movedImageUrl);
            productImage.setIsDefault(i == 0);

            productImagesRepo.save(productImage);
        }

        for (StockDto stockDto : setProductsDto.getStocks()) {
            Stock stock = modelMapper.map(stockDto, Stock.class);
            stock.setId(null);

            stock.setProducts(savedProduct);
            stockRepo.save(stock);
        }

        return ResponseDto.<Void>builder().message("Success").desc("Product successfully added.").build();
    }

    @Override
    public ResponseDto<ProductDto> getProductsById(Integer id) {
        Optional<Product> productOptional = productRepo.findById(id);

        if (productOptional.isPresent()) {
            Product product = productOptional.get();
            Brand brand = product.getBrand();

            if (brand != null && Boolean.TRUE.equals(brand.getIsDeleted())) {
                throw new BusinessException("Product is not available", Map.of("brand", "Associated brand is deleted"));
            }

            if (product.getCategory() != null &&
                    Boolean.TRUE.equals(product.getCategory().getIsDeleted())) {
                throw new BusinessException("Product is not available", Map.of("category", "Associated category is deleted"));
            }

            List<Stock> visibleStocks = stockRepo.findVisibleStocksByProductIds(List.of(product.getId()));
            Stock selectedStock = selectStockForRequestedFormat(visibleStocks, "Middle");
            Double rating = normalizeRating(feedbackRepo.findAverageRatingByProductId(product.getId()));
            Double availableTotalStockQty = calculateAvailableTotalStockQty(visibleStocks);

            ProductDto productDto = buildProductDto(product, selectedStock, rating, availableTotalStockQty, true);

            return ResponseDto.<ProductDto>builder().message("Success").desc("Product found.").object(productDto).build();
        } else {
            throw new BusinessException("Product not found with id: " + id, null);
        }
    }

    @Override
    public ResponseDto<PaginatedBrandDto> getBrands(PaginatedBrandDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<Brand> spec = ProductSpec.getBrandSpecification(dto);

        Page<Brand> brands = brandRepo.findAll(spec, pageable);

        dto.setTotalCount(brands.getTotalElements());
        dto.setTotalPages(brands.getTotalPages());
        dto.setCountPerPage(brands.getSize());

        List<BrandDto> brandDtoList = brands.getContent().stream().map(b -> {
            BrandDto brandDto = modelMapper.map(b, BrandDto.class);
            if (brandDto.getMarkets() != null) {
                brandDto.setMarkets(MarketDto.builder().id(brandDto.getMarkets().getId()).build());
            }
            return brandDto;
        }).toList();

        dto.setItems(brandDtoList);

        return ResponseDto.<PaginatedBrandDto>builder().message("Success").desc("Brands fetched successfully.").object(dto).build();
    }

    @Override
    public ResponseDto<PaginatedCategoryDto> getCategories(PaginatedCategoryDto dto) {
        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<Category> spec = ProductSpec.getCategorySpecification(dto);

        Page<Category> categories = categoryRepo.findAll(spec, pageable);

        dto.setTotalCount(categories.getTotalElements());
        dto.setTotalPages(categories.getTotalPages());
        dto.setCountPerPage(categories.getSize());

        List<CategoryDto> categoryDtoList = categories.getContent().stream()
                .map(this::buildCategoryDto)
                .toList();

        dto.setItems(categoryDtoList);

        return ResponseDto.<PaginatedCategoryDto>builder().message("Success").desc("Categories fetched successfully.").object(dto).build();
    }

    @Override
    public ResponseDto<PaginatedProductDto> getPaginatedProducts(PaginatedProductDto paginatedProductDto) {
        Specification<Product> spec = ProductSpec.getProductSpecification(paginatedProductDto);
        List<Product> filteredProducts = productRepo.findAll(spec);

        List<Integer> productIds = filteredProducts.stream()
                .map(Product::getId)
                .toList();

        Map<Integer, List<Stock>> stocksByProductId = getStocksByProductId(productIds);
        Map<Integer, Double> availableTotalStockQtyByProductId = getAvailableTotalStockQtyByProductId(stocksByProductId, paginatedProductDto.getGetActiveStocksCount());
        Map<Integer, Double> ratingsByProductId = getRatingsByProductId(productIds);
        Map<Integer, Double> soldQtyByProductId = getSoldQtyByProductId(productIds);
        Map<Integer, Long> marketOrderCountsByProductId = getMarketOrderCountsByProductId(productIds);

        List<ProductView> productViews = filteredProducts.stream()
                .map(product -> {
                    Stock selectedStock = selectStockForRequestedFormat(
                            stocksByProductId.getOrDefault(product.getId(), List.of()),
                            paginatedProductDto.getGetProductPriceAsStocks()
                    );

                    return new ProductView(
                            product,
                            selectedStock,
                            ratingsByProductId.getOrDefault(product.getId(), 0.0),
                            availableTotalStockQtyByProductId.getOrDefault(product.getId(), 0.0),
                            soldQtyByProductId.getOrDefault(product.getId(), 0.0),
                            marketOrderCountsByProductId.getOrDefault(product.getId(), 0L)
                    );
                })
                .collect(Collectors.toCollection(ArrayList::new));

        if (paginatedProductDto.getOrderByRate() != null && paginatedProductDto.getOrderByRate() > 0) {
            productViews = productViews.stream()
                    .filter(view -> view.rating() >= paginatedProductDto.getOrderByRate())
                    .collect(Collectors.toCollection(ArrayList::new));
        }

        productViews = productViews.stream()
                .filter(view -> matchesSelectedPriceRange(view.selectedStock(), paginatedProductDto))
                .collect(Collectors.toCollection(ArrayList::new));

        productViews.sort(buildProductComparator(paginatedProductDto));

        int totalItems = productViews.size();
        int pageNumber = paginatedProductDto.getPageNumber();
        int countPerPage = paginatedProductDto.getCountPerPage();
        int fromIndex = Math.min(pageNumber * countPerPage, totalItems);
        int toIndex = Math.min(fromIndex + countPerPage, totalItems);

        List<ProductDto> productDtoList = productViews.subList(fromIndex, toIndex).stream()
                .map(view -> buildProductDto(view.product(), view.selectedStock(), view.rating(), view.availableTotalStockQty(), false))
                .toList();

        paginatedProductDto.setTotalCount((long) totalItems);
        paginatedProductDto.setTotalPages(totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / countPerPage));
        paginatedProductDto.setItems(productDtoList);

        return ResponseDto.<PaginatedProductDto>builder().message("Success").desc("Products fetched successfully.").object(paginatedProductDto).build();
    }

    @Override
    public ResponseDto<Void> updateProduct(ProductDto productDto) {
        if (productDto.getId() == null) {
            throw new BusinessException("Product ID is required for update.", null);
        }

        Product existingProduct = productRepo.findById(productDto.getId())
                .orElseThrow(() -> new BusinessException("Product not found with id: " + productDto.getId(), null));

        Product incomingProduct = modelMapper.map(productDto, Product.class);
        Integer categoryId = productDto.getCategory() == null ? null : productDto.getCategory().getId();
        if (categoryId == null) {
            throw new BusinessException("Product category is required.", Map.of("category", "Select a category for this product"));
        }

        Map<String, String> err = new HashMap<>();

        if (productRepo.findByCode(incomingProduct.getCode()).filter(p -> !p.getId().equals(incomingProduct.getId())).isPresent()) {
            err.put("code", "Product already exists with this code");
        }
        if (productRepo.findByName(incomingProduct.getName()).filter(p -> !p.getId().equals(incomingProduct.getId())).isPresent()) {
            err.put("name", "Product already exists with this name");
        }

        if (!err.isEmpty()) {
            throw new BusinessException("Failed to update this product.", err);
        }

        List<ProductImageDto> incomingImages = productDto.getProductImages() == null
                ? List.of()
                : productDto.getProductImages().stream()
                  .filter(Objects::nonNull)
                  .filter(image -> image.getUrl() != null && !image.getUrl().trim().isEmpty())
                  .toList();

        Set<String> newImageKeys = incomingImages.stream()
                .map(ProductImageDto::getUrl)
                .map(this::normalizeFileReference)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<String> imagesToDelete = existingProduct.getProductImages().stream()
                .map(ProductImage::getUrl)
                .filter(Objects::nonNull)
                .filter(oldPath -> !newImageKeys.contains(normalizeFileReference(oldPath)))
                .toList();

        existingProduct.setName(incomingProduct.getName());
        existingProduct.setDesc(incomingProduct.getDesc());
        existingProduct.setCode(incomingProduct.getCode());
        existingProduct.setBrand(incomingProduct.getBrand());
        existingProduct.setCategory(categoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Category not found with id: " + categoryId, null)));
        if (incomingProduct.getIsActive() != null) {
            existingProduct.setIsActive(incomingProduct.getIsActive());
        }

        Product savedProduct = productRepo.save(existingProduct);

        scheduleFileDeletion(imagesToDelete);

        productImagesRepo.deleteAllByProducts(savedProduct);
        boolean anyMarkedDefault = incomingImages.stream().anyMatch(img -> Boolean.TRUE.equals(img.getIsDefault()));
        for (int i = 0; i < incomingImages.size(); i++) {
            ProductImageDto img = incomingImages.get(i);
            String imageUrl = img.getUrl().trim();

            // Validate image file type
            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            if (!fileStorageUtil.isImageFile(filename)) {
                throw new BusinessException("Only image files are allowed for products", Map.of("imageUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
            }

            // Move image file to products directory if it's from temporary location
            if (imageUrl.toLowerCase().contains("temporary")) {
                String movedImageUrl = fileStorageUtil.moveFile(imageUrl, "products");
                if (movedImageUrl == null) {
                    throw new BusinessException("Failed to process image file", Map.of("imageUrl", "Could not process the image file"));
                }
                imageUrl = movedImageUrl;
            }

            ProductImage toSave = ProductImage.builder()
                    .products(savedProduct)
                    .url(imageUrl)
                    .isDefault(Boolean.TRUE.equals(img.getIsDefault()) || (!anyMarkedDefault && i == 0))
                    .build();
            productImagesRepo.save(toSave);
        }


        return ResponseDto.<Void>builder().message("Success").desc("Products updated successfully.").build();
    }

    @Override
    public ResponseDto<Void> setDefaultProductImage(Integer productImageId) {
        ProductImage productImage = productImagesRepo.findById(productImageId)
                .orElseThrow(() -> new BusinessException("Product image not found with id: " + productImageId, null));

        Product product = productImage.getProducts();
        if (product == null) {
            throw new BusinessException("Associated product not found for this image", null);
        }

        List<ProductImage> images = productImagesRepo.findAllByProducts(product);
        if (images == null || images.isEmpty()) {
            throw new BusinessException("No product images found for the associated product", null);
        }

        for (ProductImage img : images) {
            img.setIsDefault(img.getId() != null && img.getId().equals(productImageId));
        }

        productImagesRepo.saveAll(images);

        return ResponseDto.<Void>builder().message("Success").desc("Default image updated successfully.").build();
    }

    @Override
    public ResponseDto<List<UnitDto>> getUnits() {
        return ResponseDto.<List<UnitDto>>builder().message("Success").object(modelMapper.map(unitRepo.findAll(), new TypeToken<List<UnitDto>>() {
        }.getType())).build();
    }

    @Override
    public ResponseDto<List<SizeDto>> getSizes(Integer marketId) {
        List<SizeDto> sizes = sizeRepo.findAllByMarketsIdOrderByNameAsc(marketId).stream()
                .map(size -> SizeDto.builder()
                        .id(size.getId())
                        .name(size.getName())
                        .marketId(size.getMarkets().getId())
                        .build())
                .toList();
        return ResponseDto.<List<SizeDto>>builder().message("Success").object(sizes).build();
    }

    @Override
    public ResponseDto<SizeDto> setSize(SetSizeDto dto) {
        Market market = marketRepo.findById(dto.getMarketId())
                .orElseThrow(() -> new BusinessException("Market not found", Map.of("marketId", "Market not found")));
        String name = dto.getName().trim();
        if (sizeRepo.existsByMarketsIdAndNameIgnoreCase(market.getId(), name)) {
            throw new BusinessException("Size already exists", Map.of("name", "This size already exists in the selected market"));
        }
        Size size = sizeRepo.save(Size.builder().name(name).markets(market).build());
        return ResponseDto.<SizeDto>builder().message("Success").object(SizeDto.builder()
                .id(size.getId()).name(size.getName()).marketId(market.getId()).build()).build();
    }

    @Override
    public ResponseDto<SizeDto> updateSize(Integer id, SetSizeDto dto) {
        Size size = sizeRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Size not found", Map.of("id", "Size not found")));
        Market market = marketRepo.findById(dto.getMarketId())
                .orElseThrow(() -> new BusinessException("Market not found", Map.of("marketId", "Market not found")));
        if (size.getMarkets() == null || !market.getId().equals(size.getMarkets().getId())) {
            throw new BusinessException("Size market cannot be changed",
                    Map.of("marketId", "A size remains assigned to its original market"));
        }
        String name = dto.getName().trim();
        if (sizeRepo.existsByMarketsIdAndNameIgnoreCaseAndIdNot(market.getId(), name, id)) {
            throw new BusinessException("Size already exists", Map.of("name", "This size already exists in the selected market"));
        }
        size.setName(name);
        sizeRepo.save(size);
        return ResponseDto.<SizeDto>builder().message("Success").object(SizeDto.builder()
                .id(size.getId()).name(size.getName()).marketId(market.getId()).build()).build();
    }

    @Override
    public ResponseDto<Void> setBrand(SetBrandDto setBrandDto) {
        Brand brand = Brand.builder()
                .name(setBrandDto.getName().trim())
                .markets(marketRepo.findById(setBrandDto.getMarketId())
                        .orElseThrow(() -> new BusinessException("Market not found with id: " + setBrandDto.getMarketId(), null)))
                .isDeleted(false)
                .isActive(true)
                .build();

        brandRepo.save(brand);

        return ResponseDto.<Void>builder().message("Success").desc("Brand saved successfully.").build();
    }

    @Override
    public ResponseDto<Void> setCategory(SetCategoryDto setCategoryDto) {
        Market market = marketRepo.findById(setCategoryDto.getMarketId())
                .orElseThrow(() -> new BusinessException("Market not found with id: " + setCategoryDto.getMarketId(), null));

        Category category = Category.builder()
                .name(setCategoryDto.getName().trim())
                .markets(market)
                .img(setCategoryDto.getImg().trim())
                .isDeleted(false)
                .isActive(true)
                .build();

        categoryRepo.save(category);

        return ResponseDto.<Void>builder().message("Success").desc("Category saved successfully.").build();
    }

    @Override
    public ResponseDto<Void> deleteBrand(Integer brandId) {
        Brand brand = brandRepo.findById(brandId)
                .orElseThrow(() -> new BusinessException("Brand not found with id: " + brandId, null));

        if (Boolean.TRUE.equals(brand.getIsDeleted())) {
            return ResponseDto.<Void>builder().message("Success").desc("Brand already deleted.").build();
        }

        brand.setIsDeleted(true);
        brand.setIsActive(false);
        brandRepo.save(brand);

        return ResponseDto.<Void>builder().message("Success").desc("Brand deleted successfully.").build();
    }

    @Override
    public ResponseDto<Void> deleteCategory(Integer categoryId) {
        Category category = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Category not found with id: " + categoryId, null));

        if (Boolean.TRUE.equals(category.getIsDeleted())) {
            return ResponseDto.<Void>builder().message("Success").desc("Category already deleted.").build();
        }

        category.setIsDeleted(true);
        category.setIsActive(false);
        categoryRepo.save(category);

        return ResponseDto.<Void>builder().message("Success").desc("Category deleted successfully.").build();
    }

    @Override
    public ResponseDto<Void> updateBrandStatus(Integer brandId, Boolean isActive) {
        Brand brand = brandRepo.findById(brandId)
                .orElseThrow(() -> new BusinessException("Brand not found with id: " + brandId, null));

        if (Boolean.TRUE.equals(brand.getIsDeleted())) {
            throw new BusinessException("Cannot update status for deleted brand", Map.of("brandId", "Brand is deleted"));
        }

        brand.setIsActive(isActive);
        brandRepo.save(brand);

        return ResponseDto.<Void>builder().message("Success").desc("Brand status updated successfully.").build();
    }

    @Override
    public ResponseDto<Void> updateCategoryStatus(Integer categoryId, Boolean isActive) {
        Category category = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Category not found with id: " + categoryId, null));

        if (Boolean.TRUE.equals(category.getIsDeleted())) {
            throw new BusinessException("Cannot update status for deleted category", Map.of("categoryId", "Category is deleted"));
        }

        category.setIsActive(isActive);
        categoryRepo.save(category);

        return ResponseDto.<Void>builder().message("Success").desc("Category status updated successfully.").build();
    }

    @Override
    public String deleteProductById(Integer id) {
        Product product = productRepo.findById(id)
                .orElseThrow(() -> new BusinessException("Product not found with id: " + id, null));

        if (product.getProductImages() != null && !product.getProductImages().isEmpty()) {
            List<String> imagePaths = product.getProductImages().stream()
                    .map(ProductImage::getUrl)
                    .toList();
            scheduleFileDeletion(imagePaths);

            productImagesRepo.deleteAllByProducts(product);
            product.getProductImages().clear();
        }

        product.setIsDeleted(true);

        if (product.getStocks() != null) {
            product.getStocks().forEach(stock -> stock.setIsDeleted(true));
        }

        productRepo.save(product);
        return "Product deleted successfully.";
    }

    @Override
    public String updateProductStatus(Integer productId, Boolean isActive) {
        Product product = productRepo.findById(productId).orElseThrow(() -> new BusinessException("Product not found with id: " + productId, null));
        product.setIsActive(isActive);
        productRepo.save(product);

        List<Stock> stocks = product.getStocks();
        stocks.forEach(stock -> stock.setIsActive(true));
        stockRepo.saveAll(stocks);
        return "Product status updated successfully.";
    }

    private Map<Integer, List<Stock>> getStocksByProductId(List<Integer> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        return stockRepo.findVisibleStocksByProductIds(productIds).stream()
                .collect(Collectors.groupingBy(stock -> stock.getProducts().getId()));
    }

    private Map<Integer, Double> getRatingsByProductId(List<Integer> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        Map<Integer, Double> ratingsByProductId = new HashMap<>();
        feedbackRepo.findAverageRatingsByProductIds(productIds).forEach(row -> {
            Integer productId = (Integer) row[0];
            Double rating = row[1] == null ? 0.0 : ((Number) row[1]).doubleValue();
            ratingsByProductId.put(productId, normalizeRating(rating));
        });
        return ratingsByProductId;
    }

    private Map<Integer, Double> getAvailableTotalStockQtyByProductId(Map<Integer, List<Stock>> stocksByProductId, Boolean getActiveStocksCount) {
        if (stocksByProductId == null || stocksByProductId.isEmpty()) {
            return Map.of();
        }

        Map<Integer, Double> availableTotalStockQtyByProductId = new HashMap<>();
        stocksByProductId.forEach((productId, stocks) ->
                availableTotalStockQtyByProductId.put(productId, calculateAvailableTotalStockQty(stocks, getActiveStocksCount))
        );

        return availableTotalStockQtyByProductId;
    }

    private Map<Integer, Double> getSoldQtyByProductId(List<Integer> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        Map<Integer, Double> soldQtyByProductId = new HashMap<>();
        marketOrderItemRepo.findTotalSoldQtyByProductIds(productIds).forEach(row -> {
            Integer productId = (Integer) row[0];
            Double soldQty = row[1] == null ? 0.0 : ((Number) row[1]).doubleValue();
            soldQtyByProductId.put(productId, soldQty);
        });
        return soldQtyByProductId;
    }

    private Map<Integer, Long> getMarketOrderCountsByProductId(List<Integer> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }

        Map<Integer, Long> marketOrderCountsByProductId = new HashMap<>();
        marketOrderItemRepo.findMarketOrderCountsByProductIds(productIds).forEach(row -> {
            Integer productId = (Integer) row[0];
            Long marketOrderCount = row[1] == null ? 0L : ((Number) row[1]).longValue();
            marketOrderCountsByProductId.put(productId, marketOrderCount);
        });
        return marketOrderCountsByProductId;
    }

    private ProductDto buildProductDto(Product product, Stock selectedStock, Double rating,
                                       Double availableTotalStockQty, boolean includeProductRefInImages) {
        ProductDto productDto = modelMapper.map(product, ProductDto.class);

        if (productDto.getBrand() != null && productDto.getBrand().getMarkets() != null) {
            productDto.getBrand().setMarkets(
                    MarketDto.builder().id(productDto.getBrand().getMarkets().getId()).build()
            );
        }

        Integer marketId = product.getCategory() != null && product.getCategory().getMarkets() != null
                ? product.getCategory().getMarkets().getId()
                : null;
        productDto.setCategory(product.getCategory() == null ? null : CategoryDto.builder()
                .id(product.getCategory().getId())
                .name(product.getCategory().getName())
                .markets(marketId == null ? null : MarketDto.builder().id(marketId).build())
                .img(product.getCategory().getImg())
                .isDeleted(product.getCategory().getIsDeleted())
                .isActive(product.getCategory().getIsActive())
                .build());
        productDto.setMarketId(marketId);

        // Ensure the product status is always present in API responses
        productDto.setIsActive(product.getIsActive());

        if (productDto.getProductImages() != null) {
            productDto.getProductImages().forEach(image -> image.setProducts(
                    includeProductRefInImages ? ProductDto.builder().id(product.getId()).build() : null
            ));
        }

        if (selectedStock != null) {
            productDto.setSellingPrice(formatPrice(selectedStock.getSellingPrice()));
            productDto.setShowingPrice(formatPrice(selectedStock.getShowingPrice()));
        } else {
            productDto.setSellingPrice(null);
            productDto.setShowingPrice(null);
        }

        productDto.setRating(normalizeRating(rating));
        productDto.setAvailableTotalStockQty(availableTotalStockQty == null ? 0.0 : availableTotalStockQty);
        return productDto;
    }

    private Double calculateAvailableTotalStockQty(List<Stock> stocks) {
        if (stocks == null || stocks.isEmpty()) {
            return 0.0;
        }

        return stocks.stream()
                .map(Stock::getQty)
                .filter(Objects::nonNull)
                .reduce(0.0, Double::sum);
    }

    private Double calculateAvailableTotalStockQty(List<Stock> stocks, Boolean getActiveStocksCount) {
        if (stocks == null || stocks.isEmpty()) {
            return 0.0;
        }

        // If flag is null, get all stocks (no filtering)
        // If flag is true, get only active stocks
        // If flag is false, get only inactive stocks
        return stocks.stream()
                .filter(stock -> getActiveStocksCount == null || stock.getIsActive().equals(getActiveStocksCount))
                .map(Stock::getQty)
                .filter(Objects::nonNull)
                .reduce(0.0, Double::sum);
    }

    private CategoryDto buildCategoryDto(Category category) {
        Integer marketId = null;
        if (category.getMarkets() != null) {
            marketId = category.getMarkets().getId();
        }

        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .markets(marketId == null ? null : MarketDto.builder().id(marketId).build())
                .img(category.getImg())
                .isDeleted(category.getIsDeleted())
                .isActive(category.getIsActive())
                .build();
    }

    private Comparator<ProductView> buildProductComparator(PaginatedProductDto dto) {
        Comparator<ProductView> comparator = Comparator.comparing(view -> view.product().getId());
        boolean hasExplicitOrdering = false;

        if (Boolean.TRUE.equals(dto.getTrendingProducts())) {
            comparator = Comparator.comparing(ProductView::marketOrderCount, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(view -> view.product().getId());
            hasExplicitOrdering = true;
        }

        if (Boolean.TRUE.equals(dto.getOrderByTopSales())) {
            Comparator<ProductView> byTopSales = Comparator.comparing(ProductView::soldQty, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(view -> getSelectedSellingPrice(view.selectedStock()), Comparator.nullsLast(Double::compareTo))
                    .thenComparing(view -> view.product().getId());
            comparator = hasExplicitOrdering ? comparator.thenComparing(byTopSales) : byTopSales;
            hasExplicitOrdering = true;
        }

        if (Boolean.TRUE.equals(dto.getOrderByMaxPrice())) {
            Comparator<ProductView> byMaxPrice = Comparator
                    .comparing((ProductView view) -> getSelectedSellingPrice(view.selectedStock()), Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(view -> view.product().getId());
            comparator = hasExplicitOrdering ? comparator.thenComparing(byMaxPrice) : byMaxPrice;
            hasExplicitOrdering = true;
        } else if (Boolean.TRUE.equals(dto.getOrderByLowPrice())) {
            Comparator<ProductView> byLowPrice = Comparator
                    .comparing((ProductView view) -> getSelectedSellingPrice(view.selectedStock()), Comparator.nullsLast(Double::compareTo))
                    .thenComparing(view -> view.product().getId());
            comparator = hasExplicitOrdering ? comparator.thenComparing(byLowPrice) : byLowPrice;
            hasExplicitOrdering = true;
        }

        if (dto.getOrderByRate() != null && dto.getOrderByRate() > 0) {
            Comparator<ProductView> byRating = Comparator
                    .comparing(ProductView::rating, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(view -> view.product().getId());
            comparator = hasExplicitOrdering ? comparator.thenComparing(byRating) : byRating;
            hasExplicitOrdering = true;
        }

        return hasExplicitOrdering ? comparator : Comparator.comparing(view -> view.product().getId());
    }

    private Stock selectStockForRequestedFormat(List<Stock> stocks, String requestedFormat) {
        if (stocks == null || stocks.isEmpty()) {
            return null;
        }

        List<Stock> sortedStocks = stocks.stream()
                .sorted(Comparator.comparing(Stock::getSellingPrice, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Stock::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        String normalizedFormat = requestedFormat == null ? "MIDDLE" : requestedFormat.trim().toUpperCase(Locale.ROOT);
        return switch (normalizedFormat) {
            case "LOWEST" -> sortedStocks.get(0);
            case "HIGHEST" -> sortedStocks.get(sortedStocks.size() - 1);
            default -> sortedStocks.get(sortedStocks.size() / 2);
        };
    }

    private Double getSelectedSellingPrice(Stock stock) {
        return stock == null ? null : stock.getSellingPrice();
    }

    private boolean matchesSelectedPriceRange(Stock selectedStock, PaginatedProductDto dto) {
        if (dto == null) {
            return true;
        }

        Double fromPrice = dto.getFromPrice();
        Double toPrice = dto.getToPrice();

        if (fromPrice == null && toPrice == null) {
            return true;
        }

        if (fromPrice != null && toPrice != null && fromPrice > toPrice) {
            return false;
        }

        Double selectedPrice = getSelectedSellingPrice(selectedStock);
        if (selectedPrice == null) {
            return false;
        }

        if (fromPrice != null && selectedPrice < fromPrice) {
            return false;
        }

        return toPrice == null || selectedPrice <= toPrice;
    }

    private String formatPrice(Double price) {
        if (price == null) {
            return null;
        }

        return String.format(Locale.US, "%.2f LKR", price);
    }

    private Double normalizeRating(Double rating) {
        if (rating == null) {
            return 0.0;
        }

        return BigDecimal.valueOf(rating)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String normalizeFileReference(String fileReference) {
        String normalized = fileStorageUtil.normalizeFileReference(fileReference);
        if (normalized != null) {
            return normalized;
        }

        if (fileReference == null || fileReference.trim().isEmpty()) {
            return null;
        }

        return fileReference.trim();
    }

    private void scheduleFileDeletion(List<String> fileReferences) {
        if (fileReferences == null || fileReferences.isEmpty()) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fileStorageUtil.deleteFiles(fileReferences);
                }
            });
            return;
        }

        fileStorageUtil.deleteFiles(fileReferences);
    }

    private record ProductView(Product product, Stock selectedStock, Double rating, Double availableTotalStockQty,
                               Double soldQty,
                               Long marketOrderCount) {
    }

    @Override
    public ResponseDto<ForceDeletePreviewDto> previewForceDeleteProduct(Integer productId) {
        Product product = productRepo.findById(productId)
                .orElseThrow(() -> new BusinessException("Product not found with id: " + productId, null));

        Map<String, Long> relatedRecordCounts = new HashMap<>();
        List<String> recordsToBeDeleted = new ArrayList<>();
        List<String> recordsToBeDetached = new ArrayList<>();
        String blockingReason = null;
        Boolean canDelete = true;

        long stockCount = stockRepo.countByProductsId(productId);
        relatedRecordCounts.put("stock", stockCount);
        if (stockCount > 0) {
            recordsToBeDeleted.add(stockCount + " stock record(s)");
        }

        long feedbackCount = feedbackRepo.countByProductId(productId);
        relatedRecordCounts.put("feedbacks", feedbackCount);
        if (feedbackCount > 0) {
            blockingReason = "Product has " + feedbackCount + " feedback record(s). Historical feedback should not be deleted.";
            canDelete = false;
        }

        long marketOrderItemCount = marketOrderItemRepo.countByStockProductId(productId);
        relatedRecordCounts.put("market_order_items", marketOrderItemCount);
        if (marketOrderItemCount > 0) {
            blockingReason = "Product has " + marketOrderItemCount + " market order item(s). Historical order data should not be deleted.";
            canDelete = false;
        }

        ForceDeletePreviewDto preview = ForceDeletePreviewDto.builder()
                .entityName("Product")
                .entityId(productId)
                .entityIdentifier(product.getName() + " (" + product.getCode() + ")")
                .canDelete(canDelete)
                .blockingReason(blockingReason)
                .relatedRecordCounts(relatedRecordCounts)
                .recordsToBeDeleted(recordsToBeDeleted)
                .recordsToBeDetached(recordsToBeDetached)
                .build();

        return ResponseDto.<ForceDeletePreviewDto>builder()
                .message("Success")
                .desc("Force delete preview generated")
                .object(preview)
                .build();
    }

    @Override
    @Transactional
    public ResponseDto<Void> forceDeleteProduct(ForceDeleteConfirmDto dto) {
        if (!Boolean.TRUE.equals(dto.getConfirmed())) {
            throw new BusinessException("Confirmation required for force delete", Map.of("confirmed", "You must confirm this action"));
        }

        Product product = productRepo.findById(dto.getEntityId())
                .orElseThrow(() -> new BusinessException("Product not found with id: " + dto.getEntityId(), null));

        long feedbackCount = feedbackRepo.countByProductId(product.getId());
        if (feedbackCount > 0) {
            throw new BusinessException("Cannot delete product with feedback records", 
                Map.of("feedbacks", "Product has " + feedbackCount + " feedback record(s). Historical feedback should not be deleted."));
        }

        long marketOrderItemCount = marketOrderItemRepo.countByStockProductId(product.getId());
        if (marketOrderItemCount > 0) {
            throw new BusinessException("Cannot delete product with market order items", 
                Map.of("market_order_items", "Product has " + marketOrderItemCount + " market order item(s). Historical order data should not be deleted."));
        }

        List<String> imagePaths = product.getProductImages().stream()
                .map(ProductImage::getUrl)
                .toList();
        
        if (!imagePaths.isEmpty()) {
            scheduleFileDeletion(imagePaths);
        }

        stockRepo.deleteByProductsId(product.getId());
        productImagesRepo.deleteAllByProducts(product);
        productRepo.delete(product);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Product permanently deleted")
                .build();
    }

    @Override
    public ResponseDto<ForceDeletePreviewDto> previewForceDeleteCategory(Integer categoryId) {
        Category category = categoryRepo.findById(categoryId)
                .orElseThrow(() -> new BusinessException("Category not found with id: " + categoryId, null));

        Map<String, Long> relatedRecordCounts = new HashMap<>();
        List<String> recordsToBeDeleted = new ArrayList<>();
        List<String> recordsToBeDetached = new ArrayList<>();
        String blockingReason = null;
        Boolean canDelete = true;

        long productCount = productRepo.countByCategoryId(categoryId);
        relatedRecordCounts.put("products", productCount);
        
        if (productCount > 0) {
            blockingReason = "Category has " + productCount + " product(s). Delete or reassign products first.";
            canDelete = false;
        }

        ForceDeletePreviewDto preview = ForceDeletePreviewDto.builder()
                .entityName("Category")
                .entityId(categoryId)
                .entityIdentifier(category.getName())
                .canDelete(canDelete)
                .blockingReason(blockingReason)
                .relatedRecordCounts(relatedRecordCounts)
                .recordsToBeDeleted(recordsToBeDeleted)
                .recordsToBeDetached(recordsToBeDetached)
                .build();

        return ResponseDto.<ForceDeletePreviewDto>builder()
                .message("Success")
                .desc("Force delete preview generated")
                .object(preview)
                .build();
    }

    @Override
    @Transactional
    public ResponseDto<Void> forceDeleteCategory(ForceDeleteConfirmDto dto) {
        if (!Boolean.TRUE.equals(dto.getConfirmed())) {
            throw new BusinessException("Confirmation required for force delete", Map.of("confirmed", "You must confirm this action"));
        }

        Category category = categoryRepo.findById(dto.getEntityId())
                .orElseThrow(() -> new BusinessException("Category not found with id: " + dto.getEntityId(), null));

        long productCount = productRepo.countByCategoryId(category.getId());
        if (productCount > 0) {
            throw new BusinessException("Cannot delete category with products", 
                Map.of("products", "Category has " + productCount + " product(s). Delete or reassign products first."));
        }

        if (category.getImg() != null && !category.getImg().trim().isEmpty()) {
            scheduleFileDeletion(List.of(category.getImg()));
        }

        categoryRepo.delete(category);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Category permanently deleted")
                .build();
    }

    @Override
    public ResponseDto<ForceDeletePreviewDto> previewForceDeleteBrand(Integer brandId) {
        Brand brand = brandRepo.findById(brandId)
                .orElseThrow(() -> new BusinessException("Brand not found with id: " + brandId, null));

        Map<String, Long> relatedRecordCounts = new HashMap<>();
        List<String> recordsToBeDeleted = new ArrayList<>();
        List<String> recordsToBeDetached = new ArrayList<>();
        String blockingReason = null;
        Boolean canDelete = true;

        long productCount = productRepo.countByBrandId(brandId);
        relatedRecordCounts.put("products", productCount);
        
        if (productCount > 0) {
            blockingReason = "Brand has " + productCount + " product(s). Delete or reassign products first.";
            canDelete = false;
        }

        ForceDeletePreviewDto preview = ForceDeletePreviewDto.builder()
                .entityName("Brand")
                .entityId(brandId)
                .entityIdentifier(brand.getName())
                .canDelete(canDelete)
                .blockingReason(blockingReason)
                .relatedRecordCounts(relatedRecordCounts)
                .recordsToBeDeleted(recordsToBeDeleted)
                .recordsToBeDetached(recordsToBeDetached)
                .build();

        return ResponseDto.<ForceDeletePreviewDto>builder()
                .message("Success")
                .desc("Force delete preview generated")
                .object(preview)
                .build();
    }

    @Override
    @Transactional
    public ResponseDto<Void> forceDeleteBrand(ForceDeleteConfirmDto dto) {
        if (!Boolean.TRUE.equals(dto.getConfirmed())) {
            throw new BusinessException("Confirmation required for force delete", Map.of("confirmed", "You must confirm this action"));
        }

        Brand brand = brandRepo.findById(dto.getEntityId())
                .orElseThrow(() -> new BusinessException("Brand not found with id: " + dto.getEntityId(), null));

        long productCount = productRepo.countByBrandId(brand.getId());
        if (productCount > 0) {
            throw new BusinessException("Cannot delete brand with products", 
                Map.of("products", "Brand has " + productCount + " product(s). Delete or reassign products first."));
        }

        brandRepo.delete(brand);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Brand permanently deleted")
                .build();
    }
}
