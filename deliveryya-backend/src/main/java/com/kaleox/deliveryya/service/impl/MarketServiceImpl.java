package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.BankDetailDto;
import com.kaleox.deliveryya.dto.MarketCategoryDto;
import com.kaleox.deliveryya.dto.MarketDto;
import com.kaleox.deliveryya.dto.UpdateMarketStatusInfoDto;
import com.kaleox.deliveryya.dto.customDto.CommonIdNameDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedBankDetailDto;
import com.kaleox.deliveryya.dto.paginatedDto.PaginatedMarketDto;
import com.kaleox.deliveryya.dto.user.UserDto;
import com.kaleox.deliveryya.entities.*;
import com.kaleox.deliveryya.repo.*;
import com.kaleox.deliveryya.service.MarketService;
import com.kaleox.deliveryya.service.specification.BankDetailSpec;
import com.kaleox.deliveryya.service.specification.MarketSpec;
import com.kaleox.deliveryya.utill.FileStorageUtil;
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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class MarketServiceImpl implements MarketService {

    private final ModelMapper modelMapper;
    private final MarketRepo marketRepo;
    private final UserRepo userRepo;
    private final MarketCategoryRepo marketCategoryRepo;
    private final BankDetailRepo bankDetailRepo;
    private final BankRepo bankRepo;
    private final MarketOrderRepo marketOrderRepo;
    private final MarketOrderItemRepo marketOrderItemRepo;
    private final FileStorageUtil fileStorageUtil;

    @Override
    public PaginatedMarketDto getMarkets(PaginatedMarketDto dto) {
        if (Boolean.TRUE.equals(dto.getFilterByBestMarket())) {
            return getBestMarkets(dto);
        }

        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<Market> spec = MarketSpec.getMarketSpecification(dto);

        Page<Market> markets = marketRepo.findAll(spec, pageable);

        dto.setTotalCount(markets.getTotalElements());
        dto.setTotalPages(markets.getTotalPages());
        dto.setCountPerPage(markets.getSize());

        List<MarketDto> marketDtoList = markets.getContent().stream()
                .map(m -> {
                    MarketDto marketDto = modelMapper.map(m, MarketDto.class);
                    marketDto.setUsers(UserDto.builder().id(marketDto.getUsers().getId()).build());
                    marketDto.setMarketCategory(MarketCategoryDto.builder().id(marketDto.getMarketCategory().getId()).build());
                    return marketDto;
                })
                .toList();

        dto.setItems(marketDtoList);

        return dto;
    }

    private PaginatedMarketDto getBestMarkets(PaginatedMarketDto dto) {
        Specification<Market> spec = MarketSpec.getMarketSpecification(dto);
        List<Market> markets = marketRepo.findAll(spec);

        List<Integer> userIds = markets.stream()
                .map(Market::getUsers)
                .filter(Objects::nonNull)
                .map(User::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<Integer, Long> orderCountsByUserId = new HashMap<>();
        if (!userIds.isEmpty()) {
            marketOrderRepo.countMarketOrdersByUserIds(userIds).forEach(row -> {
                Integer userId = (Integer) row[0];
                Long orderCount = row[1] == null ? 0L : ((Number) row[1]).longValue();
                orderCountsByUserId.put(userId, orderCount);
            });
        }

        List<Market> sortedMarkets = markets.stream()
                .sorted(Comparator
                        .comparing((Market market) -> orderCountsByUserId.getOrDefault(
                                market.getUsers() != null ? market.getUsers().getId() : null,
                                0L
                        ), Comparator.reverseOrder())
                        .thenComparing(Market::getId))
                .toList();

        int totalItems = sortedMarkets.size();
        int fromIndex = Math.min(dto.getPageNumber() * dto.getCountPerPage(), totalItems);
        int toIndex = Math.min(fromIndex + dto.getCountPerPage(), totalItems);

        dto.setTotalCount((long) totalItems);
        dto.setTotalPages(totalItems == 0 ? 0 : (int) Math.ceil((double) totalItems / dto.getCountPerPage()));
        dto.setCountPerPage(toIndex - fromIndex);
        dto.setItems(sortedMarkets.subList(fromIndex, toIndex).stream()
                .map(this::mapMarketToDto)
                .toList());

        return dto;
    }

    @Override
    public MarketDto setMarkets(MarketDto marketDto) {
        Market market = modelMapper.map(marketDto, Market.class);
        market.setId(null);
        market.setIsActive(false);

        User user = userRepo.findById(marketDto.getUsers().getId())
                .orElseThrow(() -> new BusinessException("User not found with id: " + marketDto.getUsers().getId(), null));
        market.setUsers(user);

        MarketCategory marketCategory = marketCategoryRepo.findById(marketDto.getMarketCategory().getId())
                .orElseThrow(() -> new BusinessException("Market category not found with id: " + marketDto.getMarketCategory().getId(), null));
        market.setMarketCategory(marketCategory);

        // Move and validate logo and cover images
        if (market.getLogoUrl() != null && !market.getLogoUrl().isEmpty()) {
            String logoFilename = market.getLogoUrl().substring(market.getLogoUrl().lastIndexOf("/") + 1);
            if (!fileStorageUtil.isImageFile(logoFilename)) {
                throw new BusinessException("Only image files are allowed for market logo", Map.of("logoUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
            }
            String movedLogoUrl = fileStorageUtil.moveFile(market.getLogoUrl(), "market");
            if (movedLogoUrl == null) {
                throw new BusinessException("Failed to process logo file", Map.of("logoUrl", "Could not process the logo file"));
            }
            market.setLogoUrl(movedLogoUrl);
        }

        if (market.getCoverImgUrl() != null && !market.getCoverImgUrl().isEmpty()) {
            String coverFilename = market.getCoverImgUrl().substring(market.getCoverImgUrl().lastIndexOf("/") + 1);
            if (!fileStorageUtil.isImageFile(coverFilename)) {
                throw new BusinessException("Only image files are allowed for market cover image", Map.of("coverImgUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
            }
            String movedCoverUrl = fileStorageUtil.moveFile(market.getCoverImgUrl(), "market");
            if (movedCoverUrl == null) {
                throw new BusinessException("Failed to process cover image file", Map.of("coverImgUrl", "Could not process the cover image"));
            }
            market.setCoverImgUrl(movedCoverUrl);
        }

        Market savedMarket = marketRepo.save(market);
        user.setHasMarket(true);
        userRepo.save(user);

        return modelMapper.map(savedMarket, MarketDto.class);
    }

    @Override
    public MarketDto updateMarket(MarketDto marketDto) {
        if (marketDto.getId() == null || marketDto.getId() == 0) {
            throw new BusinessException("Market ID is required for update", null);
        }

        if (marketDto.getInfoMessage() != null) {
            throw new BusinessException("infoMessage cannot be updated via update-market endpoint", null);
        }

        Market existingMarket = marketRepo.findById(marketDto.getId())
                .orElseThrow(() -> new BusinessException("Market not found with id: " + marketDto.getId(), null));

        existingMarket.setName(marketDto.getName());
        existingMarket.setLocation(marketDto.getLocation());
        existingMarket.setDesc(marketDto.getDesc());
        existingMarket.setFirstNum(marketDto.getFirstNum());
        existingMarket.setSecondNum(marketDto.getSecondNum());
        existingMarket.setWhatsApp(marketDto.getWhatsApp());
        existingMarket.setIsActive(false);

        // Handle logo image
        if (marketDto.getLogoUrl() != null && !marketDto.getLogoUrl().isEmpty()) {
            String incomingLogo = marketDto.getLogoUrl().trim();
            String existingLogo = existingMarket.getLogoUrl();

            // Only update if it's different (new file from temporary location)
            if (!Objects.equals(incomingLogo, existingLogo)) {
                String logoFilename = incomingLogo.substring(incomingLogo.lastIndexOf("/") + 1);
                if (!fileStorageUtil.isImageFile(logoFilename)) {
                    throw new BusinessException("Only image files are allowed for market logo", Map.of("logoUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
                }

                // Move from temporary location if needed
                if (incomingLogo.toLowerCase().contains("temporary")) {
                    String movedLogoUrl = fileStorageUtil.moveFile(incomingLogo, "market");
                    if (movedLogoUrl == null) {
                        throw new BusinessException("Failed to process logo file", Map.of("logoUrl", "Could not process the logo file"));
                    }
                    existingMarket.setLogoUrl(movedLogoUrl);
                } else {
                    existingMarket.setLogoUrl(incomingLogo);
                }

                // Delete old logo if exists
                if (existingLogo != null && !existingLogo.isEmpty()) {
                    scheduleFileDeletion(existingLogo);
                }
            }
        }

        // Handle cover image
        if (marketDto.getCoverImgUrl() != null && !marketDto.getCoverImgUrl().isEmpty()) {
            String incomingCover = marketDto.getCoverImgUrl().trim();
            String existingCover = existingMarket.getCoverImgUrl();

            // Only update if it's different (new file from temporary location)
            if (!Objects.equals(incomingCover, existingCover)) {
                String coverFilename = incomingCover.substring(incomingCover.lastIndexOf("/") + 1);
                if (!fileStorageUtil.isImageFile(coverFilename)) {
                    throw new BusinessException("Only image files are allowed for market cover image", Map.of("coverImgUrl", "Only image files (jpg, jpeg, png, gif, webp) are allowed"));
                }

                // Move from temporary location if needed
                if (incomingCover.toLowerCase().contains("temporary")) {
                    String movedCoverUrl = fileStorageUtil.moveFile(incomingCover, "market");
                    if (movedCoverUrl == null) {
                        throw new BusinessException("Failed to process cover image file", Map.of("coverImgUrl", "Could not process the cover image"));
                    }
                    existingMarket.setCoverImgUrl(movedCoverUrl);
                } else {
                    existingMarket.setCoverImgUrl(incomingCover);
                }

                // Delete old cover if exists
                if (existingCover != null && !existingCover.isEmpty()) {
                    scheduleFileDeletion(existingCover);
                }
            }
        }

        User user = userRepo.findById(marketDto.getUsers().getId())
                .orElseThrow(() -> new BusinessException("User not found with id: " + marketDto.getUsers().getId(), null));
        existingMarket.setUsers(user);

        MarketCategory marketCategory = marketCategoryRepo.findById(marketDto.getMarketCategory().getId())
                .orElseThrow(() -> new BusinessException("Market category not found with id: " + marketDto.getMarketCategory().getId(), null));
        existingMarket.setMarketCategory(marketCategory);

        Market updatedMarket = marketRepo.save(existingMarket);
        MarketDto updatedMarketDto = modelMapper.map(updatedMarket, MarketDto.class);
        updatedMarketDto.setUsers(UserDto.builder().id(updatedMarket.getUsers().getId()).build());
        updatedMarketDto.setMarketCategory(MarketCategoryDto.builder().id(updatedMarket.getMarketCategory().getId()).build());

        return updatedMarketDto;
    }

    @Override
    public MarketDto updateMarketStatusInfo(UpdateMarketStatusInfoDto updateMarketStatusInfoDto) {
        if (updateMarketStatusInfoDto.getIsActive() == null && updateMarketStatusInfoDto.getInfoMessage() == null) {
            throw new BusinessException("At least one of isActive or infoMessage must be provided", null);
        }

        Market existingMarket = marketRepo.findById(updateMarketStatusInfoDto.getId())
                .orElseThrow(() -> new BusinessException("Market not found with id: " + updateMarketStatusInfoDto.getId(), null));

        if (updateMarketStatusInfoDto.getIsActive() != null) {
            existingMarket.setIsActive(updateMarketStatusInfoDto.getIsActive());
        }

        if (updateMarketStatusInfoDto.getInfoMessage() != null) {
            existingMarket.setInfoMessage(updateMarketStatusInfoDto.getInfoMessage());
        }

        if (Boolean.TRUE.equals(updateMarketStatusInfoDto.getIsActive())) {
            existingMarket.getUsers().setHasMarket(true);
            existingMarket.getUsers().setUserRole(UserRole.builder().id(8).build());// Set role to market owner
        } else {
            existingMarket.getUsers().setHasMarket(false);
            existingMarket.getUsers().setUserRole(UserRole.builder().id(8).build());// Set role to customer
        }

        userRepo.save(existingMarket.getUsers());

        Market updatedMarket = marketRepo.save(existingMarket);
        MarketDto updatedMarketDto = modelMapper.map(updatedMarket, MarketDto.class);
        updatedMarketDto.setUsers(UserDto.builder().id(updatedMarket.getUsers().getId()).build());
        updatedMarketDto.setMarketCategory(MarketCategoryDto.builder().id(updatedMarket.getMarketCategory().getId()).build());


        return updatedMarketDto;
    }

    @Override
    public String deleteMarket(Integer marketId) {
        if (marketId == null || marketId <= 0) {
            throw new BusinessException("Market ID is required", Map.of("marketId", "Market ID is required"));
        }

        Market market = marketRepo.findById(marketId)
                .orElseThrow(() -> new BusinessException("Market not found with id: " + marketId, null));
        Integer userId = market.getUsers() != null ? market.getUsers().getId() : null;

        try {
            marketRepo.deleteMarketByIdNative(marketId);
        } catch (DataIntegrityViolationException ex) {
            if (!isForeignKeyConstraintViolation(ex)) {
                throw new BusinessException("Unable to delete market", Map.of("marketId", "Delete failed due to data integrity rules"));
            }

            int updatedCount = marketRepo.softDeleteMarketById(marketId);
            if (updatedCount == 0) {
                throw new BusinessException("Market not found with id: " + marketId, null);
            }
        }

        updateDeletedMarketUserFlag(userId);
        return "Market deleted successfully";
    }

    @Override
    public void setBankDetail(BankDetailDto bankDetailDto) {
        BankDetail bankDetail = modelMapper.map(bankDetailDto, BankDetail.class);
        bankDetail.setId(null);
        bankDetail.setIsDeleted(false);
        bankDetail.setIsActive(bankDetailDto.getIsActive() != null ? bankDetailDto.getIsActive() : true);

        Bank bank = bankRepo.findById(bankDetailDto.getBank().getId())
                .orElseThrow(() -> new BusinessException("Bank not found with id: " + bankDetailDto.getBank().getId(), null));
        bankDetail.setBank(bank);

        User user = userRepo.findById(bankDetailDto.getUserId())
                .orElseThrow(() -> new BusinessException("User cloud not be found", null));
        bankDetail.setUser(user);

        bankDetailRepo.save(bankDetail);
    }

    @Override
    public void updateBankDetail(BankDetailDto bankDetailDto) {
        if (bankDetailDto.getId() == null) {
            throw new BusinessException("Bank detail ID is required for update", null);
        }

        BankDetail existingBankDetail = bankDetailRepo.findByIdAndIsDeletedFalse(bankDetailDto.getId())
                .orElseThrow(() -> new BusinessException("Bank detail not found with id: " + bankDetailDto.getId(), null));

        existingBankDetail.setName(bankDetailDto.getName());
        existingBankDetail.setAccNumber(bankDetailDto.getAccNumber());
        existingBankDetail.setBranch(bankDetailDto.getBranch());

        Bank bank = bankRepo.findById(bankDetailDto.getBank().getId())
                .orElseThrow(() -> new BusinessException("Bank not found with id: " + bankDetailDto.getBank().getId(), null));
        existingBankDetail.setBank(bank);

//         User user = userRepo.findById(bankDetailDto.getUserId())
//                .orElseThrow(() -> new BusinessException("User cloud not be found", null));
        bankDetailRepo.save(existingBankDetail);
    }

    @Override
    public String deleteBankDetail(Integer bankDetailId) {
        if (bankDetailId == null || bankDetailId <= 0) {
            throw new BusinessException("Bank detail ID is required", Map.of("bankDetailId", "Bank detail ID is required"));
        }

        BankDetail bankDetail = bankDetailRepo.findByIdAndIsDeletedFalse(bankDetailId)
                .orElseThrow(() -> new BusinessException("Bank detail not found with id: " + bankDetailId, null));

        try {
            bankDetailRepo.delete(bankDetail);
            bankDetailRepo.flush();
        } catch (DataIntegrityViolationException ex) {
            if (!isForeignKeyConstraintViolation(ex)) {
                throw new BusinessException("Unable to delete bank detail", Map.of("bankDetailId", "Delete failed due to data integrity rules"));
            }
            bankDetail.setIsDeleted(true);
            bankDetail.setIsActive(false);
            bankDetailRepo.save(bankDetail);
        }

        return "Bank detail deleted successfully";
    }

    @Override
    public String updateBankDetailStatus(Integer bankDetailId, Boolean isActive) {
        if (bankDetailId == null || bankDetailId <= 0) {
            throw new BusinessException("Bank detail ID is required", Map.of("bankDetailId", "Bank detail ID is required"));
        }
        if (isActive == null) {
            throw new BusinessException("isActive is required", Map.of("isActive", "isActive is required"));
        }

        BankDetail bankDetail = bankDetailRepo.findByIdAndIsDeletedFalse(bankDetailId)
                .orElseThrow(() -> new BusinessException("Bank detail not found with id: " + bankDetailId, null));

        bankDetail.setIsActive(isActive);
        bankDetailRepo.save(bankDetail);
        return "Bank detail status updated successfully";
    }

    @Override
    public PaginatedBankDetailDto getBankDetails(PaginatedBankDetailDto dto) {
        if ((dto.getUserId() == null || dto.getUserId() == 0) && dto.getMarketId() != null && dto.getMarketId() > 0) {
            Market market = marketRepo.findById(dto.getMarketId())
                    .orElseThrow(() -> new BusinessException("Market not found with id: " + dto.getMarketId(), null));
            dto.setUserId(market.getUsers() != null ? market.getUsers().getId() : null);
        }

        Pageable pageable = PageRequest.of(dto.getPageNumber(), dto.getCountPerPage(), Sort.by("id").ascending());

        Specification<BankDetail> spec = BankDetailSpec.getBankDetailSpecification(dto);

        Page<BankDetail> bankDetails = bankDetailRepo.findAll(spec, pageable);

        dto.setTotalCount(bankDetails.getTotalElements());
        dto.setTotalPages(bankDetails.getTotalPages());
        dto.setCountPerPage(bankDetails.getSize());

        List<BankDetailDto> bankDetailDtoList = bankDetails.getContent().stream()
                .map(this::mapBankDetailToDto)
                .toList();

        dto.setItems(bankDetailDtoList);

        return dto;
    }

    @Override
    public List<BankDetailDto> getBankDetailsByUser(Integer userId, Boolean isActive) {
        if (userId != null && userId > 0) {
            userRepo.findById(userId).orElseThrow(() -> new BusinessException("User cloud not be found", null));
            List<BankDetail> bankDetails = bankDetailRepo.findAllByUser_IdAndIsDeletedFalse(userId);
            if (isActive != null) {
                bankDetails = bankDetails.stream()
                        .filter(item -> Objects.equals(item.getIsActive(), isActive))
                        .toList();
            }
            return bankDetails.stream()
                    .map(this::mapBankDetailToDto)
                    .toList();
        }

        if (userId == null || userId == 0) {
            List<BankDetail> bankDetails = bankDetailRepo.findAllByIsDeletedFalse();
            if (isActive != null) {
                bankDetails = bankDetails.stream()
                        .filter(item -> Objects.equals(item.getIsActive(), isActive))
                        .toList();
            }
            return bankDetails.stream()
                    .map(this::mapBankDetailToDto)
                    .toList();
        }

        List<BankDetail> bankDetails;

        if (userId != null && userId != 0) {
           User user = userRepo.findById(userId).orElseThrow(() -> new BusinessException("User cloud not be found", null));

            if (user.getId() == 1) {
                // Case 1: Market id = 1 → only that market
                bankDetails = bankDetailRepo.findByUser(user);
            } else {
                // Case 2: Market id != 1 → prepend market 1 details
                User userOne = userRepo.findById(1)
                        .orElseThrow(() -> new BusinessException("Market with id 1 not found", null));

                List<BankDetail> marketOneDetails = bankDetailRepo.findByUser(userOne);
                List<BankDetail> otherMarketDetails = bankDetailRepo.findByUser(user);

                bankDetails = new ArrayList<>();
                bankDetails.addAll(marketOneDetails);   // put market 1 details first
                bankDetails.addAll(otherMarketDetails); // then add the requested market
            }
        } else {
            // Case 3: No market id provided → return all
            bankDetails = bankDetailRepo.findAll();
        }

        List<BankDetailDto> bankDetailDtoList = bankDetails.stream()
                .map(bd -> {
                    BankDetailDto dto = modelMapper.map(bd, BankDetailDto.class);
                    dto.setBank(CommonIdNameDto.builder()
                            .id(bd.getBank().getId())
                            .name(bd.getBank().getName())
                            .build());
                    dto.setUserId(bd.getUser().getId());
                    return dto;
                })
                .toList();

        return bankDetailDtoList;
    }

    @Override
    public List<BankDetailDto> getBankDetailsByUserIdAndBankDetailId(Integer userId, Integer bankDetailId, Boolean isActive) {
        List<BankDetail> bankDetails = resolveBankDetailTargets(userId, bankDetailId);
        if (isActive != null) {
            bankDetails = bankDetails.stream()
                    .filter(item -> Objects.equals(item.getIsActive(), isActive))
                    .toList();
        }
        return bankDetails.stream()
                .map(this::mapBankDetailToDto)
                .toList();
    }

    @Override
    public PaginatedBankDetailDto getBankDetailsByUserIdAndBankDetailIdPaginated(PaginatedBankDetailDto dto) {
        if (dto.getPageNumber() == null || dto.getPageNumber() < 0) {
            throw new BusinessException("Invalid page number", Map.of("pageNumber", "pageNumber must be 0 or greater"));
        }
        if (dto.getCountPerPage() == null || dto.getCountPerPage() <= 0) {
            throw new BusinessException("Invalid count per page", Map.of("countPerPage", "countPerPage must be greater than 0"));
        }
        if ((dto.getUserId() == null || dto.getUserId() == 0) && dto.getMarketId() != null && dto.getMarketId() > 0) {
            Market market = marketRepo.findById(dto.getMarketId())
                    .orElseThrow(() -> new BusinessException("Market not found with id: " + dto.getMarketId(), null));
            dto.setUserId(market.getUsers() != null ? market.getUsers().getId() : null);
        }

        List<BankDetail> filteredItems = new ArrayList<>(resolveBankDetailTargets(dto.getUserId(), dto.getBankDetailId()));

        if (dto.getIsActive() != null) {
            filteredItems = filteredItems.stream()
                    .filter(item -> Objects.equals(item.getIsActive(), dto.getIsActive()))
                    .toList();
        }

        if (dto.getSearch() != null && !dto.getSearch().isBlank()) {
            String searchText = dto.getSearch().trim().toLowerCase(Locale.ROOT);
            filteredItems = filteredItems.stream()
                    .filter(item -> {
                        String name = item.getName() == null ? "" : item.getName().toLowerCase(Locale.ROOT);
                        String accNumber = item.getAccNumber() == null ? "" : item.getAccNumber().toLowerCase(Locale.ROOT);
                        String branch = item.getBranch() == null ? "" : item.getBranch().toLowerCase(Locale.ROOT);
                        String bankName = item.getBank() != null && item.getBank().getName() != null
                                ? item.getBank().getName().toLowerCase(Locale.ROOT)
                                : "";
                        return name.contains(searchText) || accNumber.contains(searchText) || branch.contains(searchText) || bankName.contains(searchText);
                    })
                    .toList();
        }

        long totalCount = filteredItems.size();
        int totalPages = totalCount == 0 ? 0 : (int) Math.ceil((double) totalCount / dto.getCountPerPage());
        int fromIndex = dto.getPageNumber() * dto.getCountPerPage();
        int toIndex = Math.min(fromIndex + dto.getCountPerPage(), filteredItems.size());

        List<BankDetailDto> pageItems = fromIndex >= filteredItems.size()
                ? List.of()
                : filteredItems.subList(fromIndex, toIndex).stream()
                .map(this::mapBankDetailToDto)
                .toList();

        dto.setTotalCount(totalCount);
        dto.setTotalPages(totalPages);
        dto.setItems(pageItems);
        return dto;
    }

    private List<BankDetail> resolveBankDetailTargets(Integer userId, Integer bankDetailId) {
        if (bankDetailId != null && bankDetailId > 0) {
            if (userId != null && userId > 0) {
                return Collections.singletonList(
                        bankDetailRepo.findByIdAndUser_IdAndIsDeletedFalse(bankDetailId, userId)
                                .orElseThrow(() -> new BusinessException("Bank detail not found", Map.of("bankDetailId", "Bank detail not found")))
                );
            }
            return Collections.singletonList(
                    bankDetailRepo.findByIdAndIsDeletedFalse(bankDetailId)
                            .orElseThrow(() -> new BusinessException("Bank detail not found", Map.of("bankDetailId", "Bank detail not found")))
            );
        }

        if (userId != null && userId > 0) {
            userRepo.findById(userId).orElseThrow(() -> new BusinessException("User cloud not be found", null));
            return bankDetailRepo.findAllByUser_IdAndIsDeletedFalse(userId);
        }

        throw new BusinessException("Either userId or bankDetailId is required", Map.of("request", "Provide userId or bankDetailId"));
    }

    private BankDetailDto mapBankDetailToDto(BankDetail bankDetail) {
        BankDetailDto dto = modelMapper.map(bankDetail, BankDetailDto.class);
        dto.setBank(CommonIdNameDto.builder()
                .id(bankDetail.getBank().getId())
                .name(bankDetail.getBank().getName())
                .build());
        dto.setUserId(bankDetail.getUser().getId());
        dto.setIsActive(bankDetail.getIsActive());
        dto.setIsDeleted(bankDetail.getIsDeleted());
        return dto;
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

    private void updateDeletedMarketUserFlag(Integer userId) {
        if (userId == null) {
            return;
        }

        userRepo.findById(userId).ifPresent(user -> {
            user.setHasMarket(false);
            userRepo.save(user);
        });
    }


    @Override
    public List<CommonIdNameDto> getBanks() {
        List<Bank> banks = bankRepo.findAll();

        List<CommonIdNameDto> bankDtoList = banks.stream()
                .map(bank -> CommonIdNameDto.builder()
                        .id(bank.getId())
                        .name(bank.getName())
                        .build())
                .toList();

        return bankDtoList;
    }

    @Override
    public MarketDto getMarketsDetailsByMarketOrderId(Integer marketOrderId) {

        MarketOrder marketOrder = marketOrderRepo.findById(marketOrderId)
                .orElseThrow(() -> new BusinessException("Market order not found with id: " + marketOrderId, null));

        List<MarketOrderItem> marketOrderItems = marketOrderItemRepo.findAllByMarketOrder(marketOrder);

        if (marketOrderItems.isEmpty()) {
            throw new BusinessException("No market order items found with market order id: " + marketOrderId, null);
        }

        List<Market> markets = marketOrderItems.stream()
                .map(MarketOrderItem::getStock)
                .filter(Objects::nonNull)
                .map(Stock::getProducts)
                .filter(Objects::nonNull)
                .map(Product::getCategory)
                .filter(Objects::nonNull)
                .map(Category::getMarkets)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (markets.isEmpty()) {
            throw new BusinessException("Market not found for market order id: " + marketOrderId, null);
        }

        if (markets.size() > 1) {
            throw new BusinessException("Multiple markets found for market order id: " + marketOrderId, null);
        }

        MarketDto marketDto = modelMapper.map(markets.get(0), MarketDto.class);
        marketDto.setUsers(UserDto.builder().id(marketDto.getUsers().getId()).build());
        marketDto.setMarketCategory(MarketCategoryDto.builder().id(marketDto.getMarketCategory().getId()).build());

        return marketDto;

    }

    @Override
    public List<CommonIdNameDto> getMarketCategories(Integer id) {

        if (id != null && id != 0) {
            MarketCategory marketCategory = marketCategoryRepo.findById(id).orElseThrow(() -> new BusinessException("Market not found with id: " + id, null));

            return List.of(CommonIdNameDto.builder().id(marketCategory.getId()).name(marketCategory.getName()).build());
        }

        return marketCategoryRepo.findAll().stream().map(
                        marketCategory -> CommonIdNameDto.builder().
                                id(marketCategory.getId())
                                .name(marketCategory.getName())
                                .build())
                .toList();
    }

    private MarketDto mapMarketToDto(Market market) {
        MarketDto marketDto = modelMapper.map(market, MarketDto.class);
        marketDto.setUsers(UserDto.builder().id(marketDto.getUsers().getId()).build());
        marketDto.setMarketCategory(MarketCategoryDto.builder().id(marketDto.getMarketCategory().getId()).build());
        return marketDto;
    }

    private void scheduleFileDeletion(String fileReference) {
        if (fileReference == null || fileReference.trim().isEmpty()) {
            return;
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fileStorageUtil.deleteFile(fileReference);
                }
            });
            return;
        }

        fileStorageUtil.deleteFile(fileReference);
    }
}
