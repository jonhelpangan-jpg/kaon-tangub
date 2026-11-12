import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, CartLine, Order } from '../api';
import { getRestaurant, MenuItem } from '../data/restaurants';
import { Coords, isInTangub, restaurantCoords, TANGUB_CENTER } from '../data/tangub';
import { useAuth } from './AuthContext';

export const SERVICE_FEE_RATE = 0.05;

type State = {
  cartRestaurantId: string | null;
  cart: CartLine[];
  favorites: string[];
  address: string;
  deliveryCoords: Coords;
};

const initial: State = {
  cartRestaurantId: null,
  cart: [],
  favorites: [],
  address: 'Rizal Ave, Poblacion, Tangub City',
  deliveryCoords: TANGUB_CENTER,
};

type Ctx = State & {
  ready: boolean;
  cartCount: number;
  subtotal: number;
  /** The signed-in customer's orders, loaded from the server. Empty while signed out. */
  orders: Order[];
  ordersError: string | null;
  refreshOrders: () => Promise<void>;
  qtyOf: (itemId: string) => number;
  /** Returns false if the cart holds items from another restaurant. */
  addItem: (restaurantId: string, item: MenuItem) => boolean;
  replaceCartWith: (restaurantId: string, item: MenuItem) => void;
  decrementItem: (itemId: string) => void;
  clearCart: () => void;
  /** Sends the order to the server. Throws with a readable message on failure. */
  placeOrder: (opts: { tip: number; payment: string; note: string }) => Promise<Order>;
  reorder: (order: Order) => void;
  toggleFavorite: (restaurantId: string) => void;
  setAddress: (address: string) => void;
  /** Returns false (and changes nothing) if the point is outside Tangub City. */
  setDeliveryCoords: (coords: Coords) => boolean;
};

const AppContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'kaon-tangub-state-v3';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setState({ ...initial, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const refreshOrders = useCallback(async () => {
    if (!userId) return;
    try {
      setOrders(await api.listOrders());
      setOrdersError(null);
    } catch (e) {
      setOrdersError((e as Error).message);
    }
  }, [userId]);

  // Load orders on sign-in; forget them on sign-out.
  useEffect(() => {
    if (userId) refreshOrders();
    else {
      setOrders([]);
      setOrdersError(null);
    }
  }, [userId, refreshOrders]);

  const subtotal = useMemo(
    () => state.cart.reduce((sum, l) => sum + l.item.price * l.qty, 0),
    [state.cart],
  );
  const cartCount = useMemo(() => state.cart.reduce((n, l) => n + l.qty, 0), [state.cart]);

  const qtyOf = useCallback(
    (itemId: string) => state.cart.find((l) => l.item.id === itemId)?.qty ?? 0,
    [state.cart],
  );

  const addItem = useCallback(
    (restaurantId: string, item: MenuItem) => {
      if (state.cartRestaurantId && state.cartRestaurantId !== restaurantId && state.cart.length) {
        return false;
      }
      setState((s) => {
        const existing = s.cart.find((l) => l.item.id === item.id);
        const cart = existing
          ? s.cart.map((l) => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l))
          : [...s.cart, { item, qty: 1 }];
        return { ...s, cartRestaurantId: restaurantId, cart };
      });
      return true;
    },
    [state.cartRestaurantId, state.cart.length],
  );

  const replaceCartWith = useCallback((restaurantId: string, item: MenuItem) => {
    setState((s) => ({ ...s, cartRestaurantId: restaurantId, cart: [{ item, qty: 1 }] }));
  }, []);

  const decrementItem = useCallback((itemId: string) => {
    setState((s) => {
      const cart = s.cart
        .map((l) => (l.item.id === itemId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0);
      return { ...s, cart, cartRestaurantId: cart.length ? s.cartRestaurantId : null };
    });
  }, []);

  const clearCart = useCallback(() => {
    setState((s) => ({ ...s, cart: [], cartRestaurantId: null }));
  }, []);

  const placeOrder = useCallback(
    async ({ tip, payment, note }: { tip: number; payment: string; note: string }) => {
      const restaurant = state.cartRestaurantId ? getRestaurant(state.cartRestaurantId) : null;
      if (!user) throw new Error('Please sign in to place an order.');
      if (!restaurant || !state.cart.length) throw new Error('Your cart is empty.');
      if (!isInTangub(state.deliveryCoords)) throw new Error('Your delivery pin is outside Tangub City.');
      const serviceFee = +(subtotal * SERVICE_FEE_RATE).toFixed(2);
      const order = await api.createOrder({
        customerName: user.name,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantCoords: restaurantCoords(restaurant.id),
        lines: state.cart,
        subtotal,
        deliveryFee: restaurant.deliveryFee,
        serviceFee,
        tip,
        total: +(subtotal + restaurant.deliveryFee + serviceFee + tip).toFixed(2),
        address: state.address,
        deliveryCoords: state.deliveryCoords,
        payment,
        note,
      });
      setOrders((list) => [order, ...list]);
      setState((s) => ({ ...s, cart: [], cartRestaurantId: null }));
      return order;
    },
    [state, subtotal, user],
  );

  const reorder = useCallback((order: Order) => {
    setState((s) => ({ ...s, cartRestaurantId: order.restaurantId, cart: order.lines }));
  }, []);

  const toggleFavorite = useCallback((restaurantId: string) => {
    setState((s) => ({
      ...s,
      favorites: s.favorites.includes(restaurantId)
        ? s.favorites.filter((id) => id !== restaurantId)
        : [...s.favorites, restaurantId],
    }));
  }, []);

  const setAddress = useCallback((address: string) => setState((s) => ({ ...s, address })), []);
  const setDeliveryCoords = useCallback((coords: Coords) => {
    if (!isInTangub(coords)) return false;
    setState((s) => ({ ...s, deliveryCoords: coords }));
    return true;
  }, []);

  const value: Ctx = {
    ...state,
    ready,
    cartCount,
    subtotal,
    orders,
    ordersError,
    refreshOrders,
    qtyOf,
    addItem,
    replaceCartWith,
    decrementItem,
    clearCart,
    placeOrder,
    reorder,
    toggleFavorite,
    setAddress,
    setDeliveryCoords,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
