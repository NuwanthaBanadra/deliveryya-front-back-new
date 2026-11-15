import React, { useMemo, useState, useRef, useEffect } from 'react';
import { TrashIcon, PlusIcon, ChevronDownIcon, CheckCircleIcon, PauseCircleIcon } from '@heroicons/react/24/outline';
import type { ProductFormData, ProductVariant } from './types';

interface Unit {
  id: number;
  name: string;
}

interface SizeOption {
  id?: number;
  name: string;
}

interface ProductVariantsProps {
  formData: ProductFormData;
  onInputChange: (field: keyof ProductFormData, value: ProductVariant[]) => void;
  fieldErrors: Record<string, string>;
  units: Unit[]; // Remove the optional flag
  sizes?: SizeOption[];
  onToggleVariantStatus?: (variantId: string) => void;
  onDeleteVariant?: (variantId: string) => Promise<boolean> | boolean;
}

const DEFAULT_SIZES: SizeOption[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '32', '34', '36', '38', '40', '42'].map((name) => ({ name }));

const resolveSwatchColor = (colorValue?: string): string | null => {
  const rawColor = colorValue?.trim();
  if (!rawColor) {
    return null;
  }

  const hexWithHash = rawColor.match(/#(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})\b/);
  if (hexWithHash) {
    return hexWithHash[0];
  }

  if (/^(?:[\dA-Fa-f]{8}|[\dA-Fa-f]{6}|[\dA-Fa-f]{4}|[\dA-Fa-f]{3})$/.test(rawColor)) {
    return `#${rawColor}`;
  }

  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    if (CSS.supports('color', rawColor)) {
      return rawColor;
    }

    const nameMatch = rawColor.match(/[A-Za-z]+(?:\s+[A-Za-z]+)*/);
    if (nameMatch) {
      const normalizedName = nameMatch[0].toLowerCase().replace(/\s+/g, '');
      if (CSS.supports('color', normalizedName)) {
        return normalizedName;
      }
    }
  }

  return null;
};

const ProductVariants = ({ formData, onInputChange, fieldErrors, units = [], sizes = [], onToggleVariantStatus, onDeleteVariant }: ProductVariantsProps) => {
  // Use units from backend
  const availableUnits = units || [];

  const presetColors = [
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Green', hex: '#10B981' },
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Yellow', hex: '#FBBF24' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Purple', hex: '#A855F7' },
    { name: 'Pink', hex: '#EC4899' },
    { name: 'Gray', hex: '#6B7280' },
    { name: 'Brown', hex: '#92400E' },
    { name: 'Teal', hex: '#14B8A6' },
  ];

  const [customSizes, setCustomSizes] = useState<SizeOption[]>([]);
  const [showAddSizeInput, setShowAddSizeInput] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [includeSizeInVariants, setIncludeSizeInVariants] = useState(false);
  const [includeShowingPriceInVariants, setIncludeShowingPriceInVariants] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const tempVariantCounterRef = useRef(0);

  const [currentVariant, setCurrentVariant] = useState<Omit<ProductVariant, 'id'>>({
    color: '#000000',
    colorName: '',
    size: '',
    showingPrice: '',
    sellingPrice: '',
    cost: '',
    weight: '',
    unit: '',
    quantity: '',
    unitId: undefined,
    sizeId: undefined,
    isActive: true,
  });

  const availableSizes = useMemo(() => {
    const sizeMap = new Map<string, SizeOption>();

    [...DEFAULT_SIZES, ...sizes, ...customSizes].forEach((size) => {
      sizeMap.set(size.name.toUpperCase(), size);
    });

    formData.variants.forEach((variant) => {
      if (!variant.size?.trim()) return;
      const key = variant.size.trim().toUpperCase();
      const existing = sizeMap.get(key);
      sizeMap.set(key, {
        id: variant.sizeId ?? existing?.id,
        name: variant.size.trim(),
      });
    });

    return Array.from(sizeMap.values());
  }, [customSizes, formData.variants, sizes]);

  const handleAddVariant = () => {
    if (selectedVariantId) {
      // In edit mode, update the variant
      handleUpdateVariant();
      return;
    }

    if (!currentVariant.color || !currentVariant.sellingPrice || !currentVariant.cost || !currentVariant.quantity) {
      alert('Please fill in all required variant fields (Color, Selling Price, Cost, Quantity)');
      return;
    }

    if (includeSizeInVariants && !currentVariant.size) {
      alert('Please select a size or disable the size option');
      return;
    }

    if (includeShowingPriceInVariants && !currentVariant.showingPrice) {
      alert('Please fill in the showing price or disable the showing price option');
      return;
    }

    if (currentVariant.weight && !currentVariant.unit) {
      alert('Please select a unit for the weight');
      return;
    }

    const newVariant: ProductVariant = {
      id: `temp_${tempVariantCounterRef.current++}`,
      ...currentVariant,
    };

    onInputChange('variants', [...formData.variants, newVariant]);

    // Reset form
    setCurrentVariant({
      color: '#000000',
      colorName: '',
      size: '',
      showingPrice: '',
      sellingPrice: '',
      cost: '',
      weight: '',
      unit: '',
      quantity: '',
      unitId: undefined,
      sizeId: undefined,
      isActive: true,
    });
  };

  const handleRemoveVariant = async (id: string) => {
    if (onDeleteVariant) {
      const canRemove = await onDeleteVariant(id);
      if (!canRemove) return;
    }

    onInputChange(
      'variants',
      formData.variants.filter((v) => v.id !== id)
    );
    if (selectedVariantId === id) {
      setSelectedVariantId(null);
    }
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    setCurrentVariant({
      color: variant.color,
      colorName: variant.colorName,
      size: variant.size,
      showingPrice: variant.showingPrice,
      sellingPrice: variant.sellingPrice,
      cost: variant.cost,
      weight: variant.weight,
      unit: variant.unit,
      quantity: variant.quantity,
      emi: variant.emi,
      description: variant.description,
      unitId: variant.unitId,
      sizeId: variant.sizeId,
      isActive: variant.isActive ?? true,
    });

    // Auto-enable size if variant has size
    if (variant.size) {
      setIncludeSizeInVariants(true);
    }

    // Auto-enable showing price if variant has showing price
    if (variant.showingPrice) {
      setIncludeShowingPriceInVariants(true);
    }
  };

  const handleUpdateVariant = () => {
    if (!selectedVariantId) return;

    if (!currentVariant.color || !currentVariant.sellingPrice || !currentVariant.cost || !currentVariant.quantity) {
      alert('Please fill in all required variant fields (Color, Selling Price, Cost, Quantity)');
      return;
    }

    if (includeSizeInVariants && !currentVariant.size) {
      alert('Please select a size or disable the size option');
      return;
    }

    if (includeShowingPriceInVariants && !currentVariant.showingPrice) {
      alert('Please fill in the showing price or disable the showing price option');
      return;
    }

    if (currentVariant.weight && !currentVariant.unit) {
      alert('Please select a unit for the weight');
      return;
    }

    const updatedVariants = formData.variants.map((v) =>
      v.id === selectedVariantId
        ? { ...v, ...currentVariant }
        : v
    );

    onInputChange('variants', updatedVariants);
    setSelectedVariantId(null);

    // Reset form
    setCurrentVariant({
      color: '#000000',
      colorName: '',
      size: '',
      showingPrice: '',
      sellingPrice: '',
      cost: '',
      weight: '',
      unit: '',
      quantity: '',
      unitId: undefined,
      sizeId: undefined,
      isActive: true,
    });
  };

  const handleColorSelect = (hex: string, name: string) => {
    setCurrentVariant({ ...currentVariant, color: hex, colorName: name });
    setShowColorPalette(false);
  };

  const handleColorInputChange = (value: string) => {
    const matchedPreset = presetColors.find(c => c.hex.toLowerCase() === value.toLowerCase());
    setCurrentVariant((prev) => ({
      ...prev,
      color: value,
      colorName: matchedPreset?.name || 'Custom',
    }));
  };

  // Close color palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPalette(false);
      }
    };

    if (showColorPalette) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPalette]);

  const handleAddCustomSize = () => {
    if (!newSizeInput.trim()) {
      alert('Please enter a size');
      return;
    }

    const sizeUpper = newSizeInput.trim().toUpperCase();

    if (availableSizes.some((size) => size.name.toUpperCase() === sizeUpper)) {
      alert('This size already exists');
      return;
    }

    setCustomSizes((prev) => [...prev, { name: sizeUpper }]);
    setCurrentVariant({ ...currentVariant, size: sizeUpper, sizeId: undefined });
    setNewSizeInput('');
    setShowAddSizeInput(false);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm transition-all duration-300 hover:shadow-md animate-slide-up border border-green-100">
      <div className="p-6 border-b border-green-100">
        <h2 className="text-xl font-semibold text-gray-800 transition-colors duration-300">
          Product Variants
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Add different color, size, price, and quantity combinations
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Variant Form */}
        <div className="space-y-4">

          {/* Toggles for Size, Showing Price, and Active Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Size Enable/Disable Toggle */}
            <div className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                id="includeSizeToggle"
                checked={includeSizeInVariants}
                onChange={(e) => {
                  setIncludeSizeInVariants(e.target.checked);
                  if (!e.target.checked) {
                    setCurrentVariant({ ...currentVariant, size: '', sizeId: undefined });
                  }
                }}
                className="w-5 h-5 cursor-pointer accent-amber-600"
              />
              <label htmlFor="includeSizeToggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Add size to this product
              </label>
            </div>

            {/* Showing Price Enable/Disable Toggle */}
            <div className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                id="includeShowingPriceToggle"
                checked={includeShowingPriceInVariants}
                onChange={(e) => {
                  setIncludeShowingPriceInVariants(e.target.checked);
                  if (!e.target.checked) {
                    setCurrentVariant({ ...currentVariant, showingPrice: '' });
                  }
                }}
                className="w-5 h-5 cursor-pointer accent-amber-600"
              />
              <label htmlFor="includeShowingPriceToggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Add showing price to this product
              </label>
            </div>

            {/* Active/Inactive Toggle */}
            <div className="flex items-center gap-3 p-4">
              <input
                type="checkbox"
                id="variantActiveToggle"
                checked={currentVariant.isActive ?? true}
                onChange={(e) => setCurrentVariant({ ...currentVariant, isActive: e.target.checked })}
                className="w-5 h-5 cursor-pointer accent-green-600"
              />
              <label htmlFor="variantActiveToggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Active variant
              </label>
            </div>
          </div>

          {/* Size, Price, Quantity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="relative" ref={colorPickerRef}>
                <div className="flex gap-2">
                  {/* Color Input Field */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={currentVariant.color}
                      onChange={(e) => handleColorInputChange(e.target.value)}
                      placeholder="#000000"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                    />
                    {/* Color Preview */}
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded border-2 border-gray-300 shadow-sm"
                      style={{ backgroundColor: currentVariant.color || '#000000' }}
                    />
                  </div>

                  {/* Color Palette Button */}
                  <button
                    type="button"
                    onClick={() => setShowColorPalette(!showColorPalette)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:border-[#F59B0F] hover:bg-amber-50 transition-all duration-300 flex items-center justify-center"
                    title="Open color palette"
                  >
                    <svg
                      className="w-6 h-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                      />
                    </svg>
                  </button>
                </div>

                {/* Color Palette Dropdown */}
                {showColorPalette && (
                  <div className="absolute z-50 top-full mt-2 left-0 p-3 bg-white rounded-lg shadow-2xl border-2 border-gray-200 w-80 max-h-96 overflow-y-auto">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preset Colors</p>
                      <div className="grid grid-cols-10 gap-2">
                        {presetColors.map((color) => (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => handleColorSelect(color.hex, color.name)}
                            className={`w-full aspect-square rounded-md border-2 transition-all duration-200 hover:scale-110 ${currentVariant.color === color.hex
                              ? 'border-[#F59B0F] ring-2 ring-[#F59B0F]/30 scale-105'
                              : 'border-gray-300 hover:border-gray-400'
                              }`}
                            style={{ backgroundColor: color.hex }}
                            title={`${color.name} (${color.hex})`}
                          >
                            {currentVariant.color === color.hex && (
                              <svg
                                className="w-full h-full p-1"
                                fill="none"
                                stroke={color.hex === '#FFFFFF' || color.hex === '#FBBF24' ? '#000000' : '#FFFFFF'}
                                strokeWidth="3"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Custom Color Picker</p>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={currentVariant.color || '#000000'}
                          onChange={(e) => handleColorInputChange(e.target.value)}
                          className="w-16 h-10 rounded border-2 border-gray-300 cursor-pointer"
                          title="Custom color picker"
                          aria-label="Custom color picker"
                        />
                        <input
                          type="text"
                          value={currentVariant.color}
                          onChange={(e) => handleColorInputChange(e.target.value)}
                          placeholder="#000000"
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Color Display */}
                {currentVariant.color && (
                  <div className="mt-2 text-xs text-gray-500">
                    {currentVariant.colorName && currentVariant.colorName !== 'Custom' && (
                      <span className="font-medium text-gray-700">{currentVariant.colorName} • </span>
                    )}
                    {currentVariant.color}
                  </div>
                )}
              </div>
            </div>
            {/* Size - Only show if enabled */}
            {includeSizeInVariants && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <select
                      value={currentVariant.size}
                      onChange={(e) => {
                        if (e.target.value === 'add-new') {
                          setShowAddSizeInput(true);
                        } else {
                          const matchedSize = availableSizes.find((size) => size.name === e.target.value);
                          setCurrentVariant({
                            ...currentVariant,
                            size: e.target.value,
                            sizeId: matchedSize?.id,
                          });
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300 appearance-none cursor-pointer hover:border-amber-300"
                      aria-label="Select product size"
                    >
                      <option value="">Select size</option>
                      {availableSizes.map((size) => (
                        <option key={`${size.id ?? 'custom'}-${size.name}`} value={size.name}>
                          {size.name}
                        </option>
                      ))}
                      <option value="add-new" className="font-semibold text-amber-600">
                        + Add New Size
                      </option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-transform duration-300 group-hover:text-blue-500" />
                  </div>

                  {/* Add Custom Size Input */}
                  {showAddSizeInput && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSizeInput}
                        onChange={(e) => setNewSizeInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddCustomSize();
                          }
                        }}
                        placeholder="e.g., M, XL, 42"
                        autoFocus
                        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomSize}
                        className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all duration-300"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddSizeInput(false);
                          setNewSizeInput('');
                        }}
                        className="px-3 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium transition-all duration-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Showing Price - Only show if enabled */}
            {includeShowingPriceInVariants && (
              <div className="group">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Showing Price <small>(LKR)</small>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">

                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={currentVariant.showingPrice}
                    onChange={(e) => setCurrentVariant({ ...currentVariant, showingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                  />
                </div>
              </div>
            )}
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price <small>(LKR)</small>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">

                </span>
                <input
                  type="number"
                  step="0.01"
                  value={currentVariant.sellingPrice}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, sellingPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                />
              </div>
            </div>
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost <small>(LKR)</small>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-medium">

                </span>
                <input
                  type="number"
                  step="0.01"
                  value={currentVariant.cost}
                  onChange={(e) => setCurrentVariant({ ...currentVariant, cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight per unit <small>(KG)</small>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentVariant.weight}
                onChange={(e) => setCurrentVariant({ ...currentVariant, weight: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a Unit
              </label>
              <div className="relative">
                <select
                  value={currentVariant.unit}
                  onChange={(e) => {
                    const selectedUnit = availableUnits.find((unit) => unit.name === e.target.value);
                    setCurrentVariant({
                      ...currentVariant,
                      unit: e.target.value,
                      unitId: selectedUnit?.id,
                    });
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300 appearance-none cursor-pointer hover:border-amber-300"
                  aria-label="Select unit"
                >
                  <option value="">Select unit</option>
                  {availableUnits.map((unit) => (
                    <option key={unit.id} value={unit.name}> {/* Use unit.name as value */}
                      {unit.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none transition-transform duration-300 group-hover:text-blue-500" />
              </div>
            </div>

            {/* Quantity */}
            <div className="group">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={currentVariant.quantity}
                onChange={(e) => setCurrentVariant({ ...currentVariant, quantity: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#F59B0F] focus:ring-2 focus:ring-[#F59B0F]/20 outline-none transition-all duration-300"
              />
            </div>
          </div>


          {/* Add Button */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddVariant}
              className="flex-1 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              {selectedVariantId ? 'Update Variant' : 'Add Variant'}
            </button>
            {selectedVariantId && (
              <button
                type="button"
                onClick={() => {
                  setSelectedVariantId(null);
                  setCurrentVariant({
                    color: '#000000',
                    colorName: '',
                    size: '',
                    showingPrice: '',
                    sellingPrice: '',
                    cost: '',
                    weight: '',
                    unit: '',
                    quantity: '',
                    unitId: undefined,
                    sizeId: undefined,
                    isActive: true,
                  });
                }}
                className="px-6 py-3 rounded-lg bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Variant Error Message */}
        {fieldErrors['variants'] && (
          <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg">
            <p className="text-sm text-red-600 font-medium">{fieldErrors['variants']}</p>
          </div>
        )}

        {/* Variants Table */}
        {formData.variants.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Added Variants</h3>
            <div className="overflow-x-auto rounded-lg border-2 border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[140px]">
                      Color
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                      Size
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                      Showing Price
                      <div className="text-[10px] text-gray-500">(LKR)</div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                      Selling Price
                      <div className="text-[10px] text-gray-500">(LKR)</div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-32">
                      Cost
                      <div className="text-[10px] text-gray-500">(LKR)</div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-28">
                      Weight
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-20">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-24">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-36">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.variants.map((variant, index) => {
                    // Check if this variant has any errors
                    const hasError = Object.keys(fieldErrors).some(key => key.startsWith(`variant_${index}_`));
                    const variantErrors = Object.keys(fieldErrors)
                      .filter(key => key.startsWith(`variant_${index}_`))
                      .map(key => fieldErrors[key]);
                    const isSelected = selectedVariantId === variant.id;
                    const swatchColor = resolveSwatchColor(variant.color);

                    return (
                      <React.Fragment key={variant.id}>
                        <tr
                          onClick={() => handleEditVariant(variant)}
                          className={`cursor-pointer transition-colors ${isSelected
                            ? 'bg-blue-100 hover:bg-blue-150'
                            : hasError
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'hover:bg-gray-50'
                            }`}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full border-2 ${fieldErrors[`variant_${index}_color`] ? 'border-red-500' : 'border-gray-300'}`}
                                style={{ backgroundColor: swatchColor || '#9CA3AF' }}
                                title={`Color: ${variant.color || 'N/A'}`}
                                aria-label={`Variant color ${variant.color || 'N/A'}`}
                              />
                              <div className="text-sm">
                                <div className="text-gray-900 font-medium">
                                  {variant.colorName || (variant.color ? 'Custom' : 'N/A')}
                                </div>
                                {variant.color && <div className="text-gray-500">{variant.color}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                            {variant.size || '-'}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${fieldErrors[`variant_${index}_showingPrice`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.showingPrice ? `${parseFloat(variant.showingPrice).toFixed(2)}` : '-'}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${fieldErrors[`variant_${index}_sellingPrice`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {parseFloat(variant.sellingPrice).toFixed(2)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-right text-sm font-medium ${fieldErrors[`variant_${index}_cost`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {parseFloat(variant.cost).toFixed(2)}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${fieldErrors[`variant_${index}_weight`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.weight ? `${variant.weight}${variant.unit ? ` ${variant.unit}` : ''}` : '-'}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${fieldErrors[`variant_${index}_unit`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.unit || '-'}
                          </td>
                          <td className={`px-4 py-4 whitespace-nowrap text-center text-sm ${fieldErrors[`variant_${index}_quantity`] ? 'text-red-600' : 'text-gray-900'}`}>
                            {variant.quantity}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center text-sm">
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${
                              variant.isActive ?? true
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {variant.isActive ?? true ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditVariant(variant);
                                }}
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-colors ${isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                title="Edit variant"
                              >
                                Edit
                              </button>

                              {onToggleVariantStatus && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVariantStatus(variant.id);
                                  }}
                                  className={`inline-flex items-center justify-center p-2 rounded-md transition-colors ${
                                    variant.isActive ?? true
                                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  }`}
                                  title={variant.isActive ?? true ? 'Deactivate variant' : 'Activate variant'}
                                  aria-label={variant.isActive ?? true ? 'Deactivate variant' : 'Activate variant'}
                                >
                                  {variant.isActive ?? true ? (
                                    <PauseCircleIcon className="w-4 h-4" />
                                  ) : (
                                    <CheckCircleIcon className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {(variant.id.startsWith('temp_') || onDeleteVariant) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveVariant(variant.id);
                                  }}
                                  className="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:text-red-800 transition-colors bg-white hover:bg-red-50"
                                  aria-label="Remove variant"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {hasError && (
                          <tr className="bg-red-50">
                            <td colSpan={10} className="px-4 py-2">
                              <div className="text-sm text-red-600">
                                {variantErrors.map((error, i) => (
                                  <div key={i}>• {error}</div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Total variants: {formData.variants.length}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductVariants;
