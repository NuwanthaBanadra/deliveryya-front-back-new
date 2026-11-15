package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.ResponseDto;
import com.kaleox.deliveryya.dto.StockDto;
import com.kaleox.deliveryya.dto.UpdateStockDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedStockDto;
import com.kaleox.deliveryya.entities.Product;
import com.kaleox.deliveryya.entities.Size;
import com.kaleox.deliveryya.entities.Stock;
import com.kaleox.deliveryya.entities.Unit;
import com.kaleox.deliveryya.repo.ProductRepo;
import com.kaleox.deliveryya.repo.SizeRepo;
import com.kaleox.deliveryya.repo.StockRepo;
import com.kaleox.deliveryya.repo.UnitRepo;
import com.kaleox.deliveryya.service.StockService;
import com.kaleox.deliveryya.service.specification.StockSpec;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class StockServiceImpl implements StockService {

    private final StockRepo stockRepo;
    private final ProductRepo productRepo;
    private final SizeRepo sizeRepo;
    private final UnitRepo unitRepo;
    private final ModelMapper modelMapper;

    @Override
    public ResponseDto<PaginatedStockDto> getStocks(PaginatedStockDto stockDto) {
        Pageable pageable = PageRequest.of(
                stockDto.getPageNumber(),
                stockDto.getCountPerPage(),
                Sort.by("id").ascending()
        );

        Specification<Stock> spec = StockSpec.getStockSpecification(stockDto);

        Page<Stock> stocks = stockRepo.findAll(spec, pageable);

        stockDto.setTotalCount(stocks.getTotalElements());
        stockDto.setTotalPages(stocks.getTotalPages());
        stockDto.setCountPerPage(stocks.getSize());

        List<StockDto> stockDtoList = stocks.getContent().stream()
                .map(stock -> {
                    StockDto dto = modelMapper.map(stock, StockDto.class);
                    // Prevent circular references
                    if (dto.getProducts() != null) {

                        dto.getProducts().setIsActive(stock.getProducts().getIsActive());

                        dto.getProducts().getProductImages().forEach(image -> image.setProducts(null));

                        dto.getProducts().setDesc(null);

                        if (dto.getProducts().getBrand() != null) {
                            dto.getProducts().getBrand().setMarkets(null);
                        }
                    }
                    return dto;
                })
                .toList();

        stockDto.setItems(stockDtoList);

        return ResponseDto.<PaginatedStockDto>builder()
                .message("Success")
                .desc("Stocks fetched successfully.")
                .object(stockDto)
                .build();
    }

    @Override
    public ResponseDto<Void> updateStocks(UpdateStockDto updateStockDto) {
        // Validate product exists
        if (updateStockDto.getProductId() == null) {
            throw new BusinessException("Product ID is required.", null);
        }

        Product product = productRepo.findById(updateStockDto.getProductId())
                .orElseThrow(() -> new BusinessException("Product not found with id: " + updateStockDto.getProductId(), null));

        if (updateStockDto.getStockDtoList() == null || updateStockDto.getStockDtoList().isEmpty()) {
            throw new BusinessException("Stock list cannot be empty.", null);
        }

        int updatedCount = 0;
        int addedCount = 0;
        int mergedCount = 0;

        for (StockDto stockDto : updateStockDto.getStockDtoList()) {
            // Case 1: If stock ID is provided, update existing stock
            if (stockDto.getId() != null) {
                Stock existingStock = stockRepo.findById(stockDto.getId())
                        .orElseThrow(() -> new BusinessException("Stock not found with id: " + stockDto.getId(), null));

                // Update fields
                existingStock.setCost(stockDto.getCost());
                existingStock.setShowingPrice(stockDto.getShowingPrice());
                existingStock.setSellingPrice(stockDto.getSellingPrice());
                existingStock.setQty(stockDto.getQty());
                existingStock.setColor(stockDto.getColor());
                existingStock.setIsActive(stockDto.getIsActive());
                existingStock.setEmi(stockDto.getEmi());
                existingStock.setWpu(stockDto.getWpu());

                // Update unit if provided
                if (stockDto.getUnit() != null && stockDto.getUnit().getId() != null) {
                    Unit unit = unitRepo.findById(stockDto.getUnit().getId())
                            .orElseThrow(() -> new BusinessException("Unit not found with id: " + stockDto.getUnit().getId(), null));
                    existingStock.setUnit(unit);
                }

                // Update size if provided
                if (stockDto.getSizes() != null && stockDto.getSizes().getId() != null) {
                    Size size = resolveSizeForProduct(stockDto.getSizes().getId(), product);
                    existingStock.setSizes(size);
                }

                stockRepo.save(existingStock);
                updatedCount++;
            } else {
                // Case 2: No ID provided - check if similar stock exists (same product, color, and prices)
                Optional<Stock> existingStockOpt = stockRepo.findByProductsAndColorAndCostAndShowingPriceAndSellingPrice(
                        product,
                        stockDto.getColor(),
                        stockDto.getCost(),
                        stockDto.getShowingPrice(),
                        stockDto.getSellingPrice()
                );

                if (existingStockOpt.isPresent()) {
                    // Stock with same attributes exists - update quantity (merge)
                    Stock existingStock = existingStockOpt.get();
                    existingStock.setQty(existingStock.getQty() + stockDto.getQty());

                    // Update other fields that might have changed
                    existingStock.setEmi(stockDto.getEmi());
                    existingStock.setWpu(stockDto.getWpu());

                    // Update unit if provided
                    if (stockDto.getUnit() != null && stockDto.getUnit().getId() != null) {
                        Unit unit = unitRepo.findById(stockDto.getUnit().getId())
                                .orElseThrow(() -> new BusinessException("Unit not found with id: " + stockDto.getUnit().getId(), null));
                        existingStock.setUnit(unit);
                    }

                    // Update size if provided
                    if (stockDto.getSizes() != null && stockDto.getSizes().getId() != null) {
                        Size size = resolveSizeForProduct(stockDto.getSizes().getId(), product);
                        existingStock.setSizes(size);
                    }

                    stockRepo.save(existingStock);
                    mergedCount++;
                } else {
                    // Case 3: New stock - add it
                    if (stockDto.getUnit() == null || stockDto.getUnit().getId() == null) {
                        throw new BusinessException("Unit is required for new stock", Map.of("unit", "Unit ID must be provided"));
                    }

                    Stock newStock = modelMapper.map(stockDto, Stock.class);
                    newStock.setId(null); // Ensure it's treated as new
                    newStock.setProducts(product);

                    // Clear any transient Unit/Size objects created by mapper to prevent Hibernate errors
                    newStock.setUnit(null);
                    newStock.setSizes(null);

                    // Set unit from database (required)
                    Unit unit = unitRepo.findById(stockDto.getUnit().getId())
                            .orElseThrow(() -> new BusinessException("Unit not found with id: " + stockDto.getUnit().getId(), null));
                    newStock.setUnit(unit);

                    // Set size from database if provided
                    if (stockDto.getSizes() != null && stockDto.getSizes().getId() != null) {
                        Size size = resolveSizeForProduct(stockDto.getSizes().getId(), product);
                        newStock.setSizes(size);
                    }

                    stockRepo.save(newStock);
                    addedCount++;
                }
            }
        }

        String message = String.format("Stocks processed successfully. Updated: %d, Added: %d, Merged: %d",
                updatedCount, addedCount, mergedCount);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc(message)
                .build();
    }

    private Size resolveSizeForProduct(Integer sizeId, Product product) {
        Size size = sizeRepo.findById(sizeId)
                .orElseThrow(() -> new BusinessException("Size not found with id: " + sizeId, null));
        Integer productMarketId = product.getCategory() == null || product.getCategory().getMarkets() == null
                ? null
                : product.getCategory().getMarkets().getId();
        Integer sizeMarketId = size.getMarkets() == null ? null : size.getMarkets().getId();
        if (productMarketId == null || !productMarketId.equals(sizeMarketId)) {
            throw new BusinessException("Size does not belong to the product market",
                    Map.of("size", "Select a size configured for this market"));
        }
        return size;
    }

    @Override
    public ResponseDto<Void> updateStockStatus(Integer stockId, Boolean isActive) {
        Stock stock = stockRepo.findById(stockId)
                .orElseThrow(() -> new BusinessException("Stock not found with id: " + stockId, null));

        if (Boolean.TRUE.equals(stock.getIsDeleted())) {
            throw new BusinessException("Cannot update status for deleted stock", java.util.Map.of("stockId", "Stock is deleted"));
        }

        stock.setIsActive(isActive);
        stockRepo.save(stock);

        return ResponseDto.<Void>builder()
                .message("Success")
                .desc("Stock status updated successfully.")
                .build();
    }

    @Override
    public String deleteStock(List<Integer> stockIds) {
        if (stockIds == null || stockIds.isEmpty()) {
            throw new BusinessException("Stock IDs are required", Map.of("stockIds", "At least one stock ID is required"));
        }

        for (Integer stockId : stockIds) {
            if (stockId == null || stockId <= 0) {
                throw new BusinessException("Invalid stock ID", Map.of("stockId", "Stock ID must be greater than zero"));
            }

            stockRepo.findById(stockId)
                    .orElseThrow(() -> new BusinessException("Stock not found with id: " + stockId, null));

            try {
                stockRepo.deleteStockByIdNative(stockId);
            } catch (DataIntegrityViolationException ex) {
                if (!isForeignKeyConstraintViolation(ex)) {
                    throw new BusinessException("Unable to delete stock", Map.of("stockId", "Delete failed due to data integrity rules"));
                }

                int updatedCount = stockRepo.softDeleteStockById(stockId);
                if (updatedCount == 0) {
                    throw new BusinessException("Stock not found with id: " + stockId, null);
                }
            }
        }
        return "Stocks deleted successfully";
    }

    @Override
    public String dropStock(List<Integer> stockIds) {
        return deleteStock(stockIds);
    }

    private boolean isForeignKeyConstraintViolation(DataIntegrityViolationException ex) {
        Throwable current = ex;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String lowerMessage = message.toLowerCase(Locale.ROOT);
                if (lowerMessage.contains("foreign key")
                        || lowerMessage.contains("violates foreign key constraint")
                        || lowerMessage.contains("a foreign key constraint fails")
                        || lowerMessage.contains("constraint fails")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }
}
