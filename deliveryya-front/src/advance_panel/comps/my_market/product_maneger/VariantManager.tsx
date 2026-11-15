import React from 'react';
import ProductVariants from '../products/ProductVariants';
import type { ProductVariant, ProductFormData } from '../products/types';

interface Unit {
    id: number;
    name: string;
}
interface Size {
    id: number;
    name: string;
}

interface VariantManagerProps {
    formData: ProductFormData;
    onInputChange: (field: keyof ProductFormData, value: ProductVariant[]) => void;
    fieldErrors: Record<string, string>;
    units: Unit[];
    sizes?: Size[];
    onToggleVariantStatus?: (variantId: string) => void;
    onDeleteVariant?: (variantId: string) => Promise<boolean> | boolean;
}

const VariantManager: React.FC<VariantManagerProps> = ({ formData, onInputChange, fieldErrors, units = [], sizes = [], onToggleVariantStatus, onDeleteVariant }) => {
    return (
        <div>
            <ProductVariants
                formData={formData}
                onInputChange={onInputChange}
                fieldErrors={fieldErrors}
                units={units}
                sizes={sizes}
                onToggleVariantStatus={onToggleVariantStatus}
                onDeleteVariant={onDeleteVariant}
            />
        </div>
    );
};

export default VariantManager;
