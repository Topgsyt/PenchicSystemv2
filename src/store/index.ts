import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, User, Register, CashDrawer } from '../types';

interface StoreState {
  user: User | null;
  cart: CartItem[];
  activeRegister: Register | null;
  activeCashDrawer: CashDrawer | null;
  setUser: (user: User | null) => void;
  setActiveRegister: (register: Register | null) => void;
  setActiveCashDrawer: (drawer: CashDrawer | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, variantId?: string, change: number) => void;
  clearCart: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      user: null,
      cart: [],
      activeRegister: null,
      activeCashDrawer: null,
      setUser: (user) => set({ user }),
      setActiveRegister: (register) => set({ activeRegister: register }),
      setActiveCashDrawer: (drawer) => set({ activeCashDrawer: drawer }),
      addToCart: (item) =>
        set((state) => {
          const existingItem = state.cart.find(
            (cartItem) =>
              cartItem.product.id === item.product.id &&
              cartItem.variant?.id === item.variant?.id
          );

          if (existingItem) {
            const newQuantity = existingItem.quantity + item.quantity;
            if (newQuantity > existingItem.product.stock) {
              // Don't use alert in store, let components handle this
              return state;
            }

            return {
              ...state,
              cart: state.cart.map((cartItem) =>
                cartItem === existingItem
                  ? { ...cartItem, quantity: newQuantity }
                  : cartItem
              ),
            };
          }

          return { ...state, cart: [...state.cart, item] };
        }),
      updateCartQuantity: (productId, variantId, change) =>
        set((state) => {
          const item = state.cart.find(
            (cartItem) =>
              cartItem.product.id === productId &&
              (variantId !== undefined
                ? cartItem.variant?.id === variantId
                : !cartItem.variant)
          );

          if (!item) return state;

          const newQuantity = item.quantity + change;

          if (newQuantity < 1 || newQuantity > item.product.stock) {
            return state;
          }

          return {
            ...state,
            cart: state.cart.map((cartItem) =>
              cartItem.product.id === productId &&
              (variantId !== undefined
                ? cartItem.variant?.id === variantId
                : !cartItem.variant)
                ? { ...cartItem, quantity: newQuantity }
                : cartItem
            ),
          };
        }),
      removeFromCart: (productId, variantId) =>
        set((state) => ({
          ...state,
          cart: state.cart.filter(
            (item) =>
              !(
                item.product.id === productId &&
                (variantId ? item.variant?.id === variantId : !item.variant)
              )
          ),
        })),
      clearCart: () => set((state) => ({ ...state, cart: [] })),
    }),
    {
      name: 'penchic-farm-storage',
    }
  )
);