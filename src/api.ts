import { Platform } from 'react-native';

import type { MenuItem } from './data/restaurants';
import type { Coords } from './data/tangub';

/**
 * Where the Kaon Tangub server lives.
 * - Web build served by the server itself: same origin, nothing to configure.
 * - Phone builds / `expo start`: set EXPO_PUBLIC_API_URL, e.g. https://your-app.onrender.com
 */
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const apiConfigured = Platform.OS === 'web' || API_URL.length > 0;

export type CartLine = { item: MenuItem; qty: number };

export type OrderStatus = 'placed' | 'accepted' | 'picked_up' | 'delivered' | 'cancelled';

export type Order = {
  id: string;
  status: OrderStatus;
  customerId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  restaurantCoords: Coords;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tip: number;
  total: number;
  address: string;
  deliveryCoords: Coords;
  payment: string;
  note: string;
  createdAt: number;
  updatedAt: number;
  riderId: string | null;
  riderName: string | null;
  /** Latest GPS position reported by the rider's phone. */
  courier: (Coords & { updatedAt: number }) | null;
};

export type NewOrder = Omit<
  Order,
  'id' | 'status' | 'createdAt' | 'updatedAt' | 'riderId' | 'riderName' | 'courier'
>;

export type RiderOrders = { available: Order[]; active: Order[]; completed: Order[] };

async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!apiConfigured) {
    throw new Error('The app is not connected to a server yet (EXPO_PUBLIC_API_URL is not set).');
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the server. Check your internet connection.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Server error (${res.status})`);
  return data as T;
}

export const api = {
  createOrder: (order: NewOrder) => request<Order>('/orders', order),
  listOrders: (customerId: string) => request<Order[]>(`/orders?customerId=${encodeURIComponent(customerId)}`),
  getOrder: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
  cancelOrder: (id: string, customerId: string) => request<Order>(`/orders/${id}/cancel`, { customerId }),

  riderOrders: (riderId: string) => request<RiderOrders>(`/rider/orders?riderId=${encodeURIComponent(riderId)}`),
  acceptOrder: (id: string, riderId: string, riderName: string) =>
    request<Order>(`/orders/${id}/accept`, { riderId, riderName }),
  setStatus: (id: string, riderId: string, status: 'picked_up' | 'delivered') =>
    request<Order>(`/orders/${id}/status`, { riderId, status }),
  sendLocation: (id: string, riderId: string, coords: Coords) =>
    request<{ ok: true }>(`/orders/${id}/location`, {
      riderId,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }),
};

/** What the customer sees for each step. */
export const ORDER_STAGES: { status: OrderStatus; label: string; detail: string }[] = [
  { status: 'placed', label: 'Order placed', detail: 'Looking for a rider' },
  { status: 'accepted', label: 'Rider assigned', detail: 'Your rider is heading to the restaurant' },
  { status: 'picked_up', label: 'Picked up', detail: 'Your rider is on the way to you' },
  { status: 'delivered', label: 'Delivered', detail: 'Enjoy your meal!' },
];

export const stageIndex = (order: Order) => Math.max(0, ORDER_STAGES.findIndex((s) => s.status === order.status));
export const isFinished = (order: Order) => order.status === 'delivered' || order.status === 'cancelled';
export const statusLabel = (order: Order) =>
  order.status === 'cancelled' ? 'Cancelled' : ORDER_STAGES[stageIndex(order)].label;
