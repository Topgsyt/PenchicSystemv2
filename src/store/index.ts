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
              alert('Cannot add more items than available in stock');
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
          return {
            ...state,
            cart: state.cart.map((item) => {
              if (
                item.product.id === productId &&
                (variantId ? item.variant?.id === variantId : !item.variant?.id)
              ) {
                const newQuantity = item.quantity + change;
                
                if (newQuantity < 1) {
                  return item;
                }
                
                if (newQuantity > item.product.stock) {
                  return item;
                }

                return {
                  ...item,
                  quantity: newQuantity,
                };
              }
              return item;
            }),
          };
        }),
      removeFromCart: (productId, variantId) =>
        set((state) => ({
          ...state,
          cart: state.cart.filter(
            (item) =>
              !(
                item.product.id === productId &&
                (variantId ? item.variant?.id === variantId : !item.variant?.id)
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