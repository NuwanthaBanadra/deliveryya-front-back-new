export const CART_STORAGE_KEY = 'deliveryya_cart';
export const CART_UPDATED_EVENT = 'deliveryya-cart-updated';

export type CartItem = {
  stockId?: number;
  productId?: number;
  marketId?: number;
  id: number;
  title: string;
  price: number;
  quantity: number;
  stockQty?: number;
  img: string;
  seller: string;
  inStock: boolean;
};

const isValidCartItem = (item: unknown): item is CartItem => {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<CartItem>;

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.price === 'number' &&
    typeof candidate.quantity === 'number' &&
    typeof candidate.img === 'string' &&
    typeof candidate.seller === 'string' &&
    typeof candidate.inStock === 'boolean'
  );
};

export const getCartItems = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidCartItem);
  } catch (error) {
    console.error('Failed to parse cart items from localStorage', error);
    return [];
  }
};

export const saveCartItems = (items: CartItem[]) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
};

export const addToCart = (newItem: Omit<CartItem, 'quantity'>, quantity = 1): CartItem[] => {
  const currentItems = getCartItems();
  const existingIndex = currentItems.findIndex((item) => item.id === newItem.id);

  if (existingIndex >= 0) {
    const updated = currentItems.map((item, index) =>
      index === existingIndex
        ? {
            ...item,
            quantity: item.quantity + quantity,
            inStock: newItem.inStock,
            price: newItem.price,
            img: newItem.img,
            title: newItem.title,
            seller: newItem.seller,
          }
        : item
    );

    saveCartItems(updated);
    return updated;
  }

  const updated = [...currentItems, { ...newItem, quantity }];
  saveCartItems(updated);
  return updated;
};

export const updateCartItemQuantity = (id: number, quantity: number): CartItem[] => {
  const currentItems = getCartItems();
  const updated = currentItems
    .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
    .filter((item) => item.quantity > 0);

  saveCartItems(updated);
  return updated;
};

export const removeCartItem = (id: number): CartItem[] => {
  const currentItems = getCartItems();
  const updated = currentItems.filter((item) => item.id !== id);
  saveCartItems(updated);
  return updated;
};
