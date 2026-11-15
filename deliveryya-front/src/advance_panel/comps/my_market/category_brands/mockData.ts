import type{ Category } from './types';

export const mockCategories: Category[] = [
  {
    id: 1,
    name: 'Electronics',
    status: 'active',
    productsCount: 128,
    brands: [
      { id: 11, name: 'ElectraTech', status: 'active', productsCount: 42, marketId: 1, products: [] },
      { id: 12, name: 'NovaSound', status: 'active', productsCount: 27, marketId: 1, products: [] },
      { id: 13, name: 'PulseGear', status: 'inactive', productsCount: 9, marketId: 2, products: [] },
    ],
  },
  {
    id: 2,
    name: 'Fashion',
    status: 'active',
    productsCount: 76,
    brands: [
      { id: 21, name: 'UrbanTailor', status: 'active', productsCount: 18, marketId: 1, products: [] },
      { id: 22, name: 'LuxeThreads', status: 'active', productsCount: 33, marketId: 1, products: [] },
      { id: 23, name: 'StreetHive', status: 'inactive', productsCount: 12, marketId: 1, products: [] },
    ],
  },
  {
    id: 3,
    name: 'Grocery',
    status: 'inactive',
    productsCount: 54,
    brands: [
      { id: 31, name: 'GreenLeaf', status: 'active', productsCount: 16, marketId: 1, products: [] },
      { id: 32, name: 'FarmFresh', status: 'inactive', productsCount: 11, marketId: 1, products: [] },
      { id: 33, name: 'PureBite', status: 'active', productsCount: 8, marketId: 1, products: [] },
    ],
  },
  {
    id: 4,
    name: 'Sports',
    status: 'active',
    productsCount: 39,
    brands: [
      { id: 41, name: 'SwiftRun', status: 'active', productsCount: 15, marketId: 1, products: [] },
      { id: 42, name: 'FlexPro', status: 'inactive', productsCount: 6, marketId: 1, products: [] },
    ],
  },
];
