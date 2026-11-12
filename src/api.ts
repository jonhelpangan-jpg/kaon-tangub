import { Platform } from 'react-native';

import type { MenuItem } from './data/restaurants';
import type { Coords } from './data/tangub';

/**
 * Where the Kaon Tangub server lives.
 * - Web build served by the server itself: same origin, nothing to configure.
 * - Phone builds / `expo start`: set EXPO_PUBLIC_API_URL, e.g. https://kaon-tangub.onrender.com
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
  riderPhone: string | null;
  /** Latest GPS position reported by the rider's phone. */
  courier: (Coords & { updatedAt: number }) | null;
};

export type NewOrder = Pick<
  Order,
  | 'customerName'
  | 'restaurantId'
  | 'restaurantName'
  | 'restaurantCoords'
  | 'lines'
  | 'subtotal'
  | 'deliveryFee'
  | 'serviceFee'
  | 'tip'
  | 'total'
  | 'address'
  | 'deliveryCoords'
  | 'payment'
  | 'note'
>;

export type RiderOrders = { available: Order[]; active: Order[]; completed: Order[] };

export type RiderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type RiderProfile = {
  status: RiderStatus;
  fullName: string;
  phone: string;
  vehicle: string;
  plate: string;
  appliedAt: number;
};
export type RiderApplication = Pick<RiderProfile, 'fullName' | 'phone' | 'vehicle' | 'plate'>;

export type User = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  isAdmin: boolean;
  rider: RiderProfile | null;
};

export type AdminRider = { id: string; email: string; name: string; rider: RiderProfile };

export type ServerConfig = { googleClientId: string; testLogin: boolean };

/** Thrown for any failed request. `status` 401 means the user must sign in again. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let sessionToken: string | null = null;
export const setSessionToken = (token: string | null) => {
  sessionToken = token;
};

async function request<T>(path: string, body?: unknown): Promise<T> {
  if (!apiConfigured) {
    throw new ApiError(0, 'The app is not connected to a server yet (EXPO_PUBLIC_API_URL is not set).');
  }
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your internet connection.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Server error (${res.status})`);
  return data as T;
}

export const api = {
  config: () => request<ServerConfig>('/config'),
  signInWithGoogle: (credential: string) => request<{ token: string; user: User }>('/auth/google', { credential }),
  signInForTesting: (email: string, name: string) => request<{ token: string; user: User }>('/auth/test', { email, name }),
  me: () => request<User>('/me'),

  createOrder: (order: NewOrder) => request<Order>('/orders', order),
  listOrders: () => request<Order[]>('/orders'),
  getOrder: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
  cancelOrder: (id: string) => request<Order>(`/orders/${id}/cancel`, {}),

  applyAsRider: (application: RiderApplication) => request<User>('/rider/apply', application),
  riderOrders: () => request<RiderOrders>('/rider/orders'),
  acceptOrder: (id: string) => request<Order>(`/orders/${id}/accept`, {}),
  setStatus: (id: string, status: 'picked_up' | 'delivered') => request<Order>(`/orders/${id}/status`, { status }),
  sendLocation: (id: string, coords: Coords) =>
    request<{ ok: true }>(`/orders/${id}/location`, { latitude: coords.latitude, longitude: coords.longitude }),

  adminRiders: () => request<AdminRider[]>('/admin/riders'),
  adminSetRider: (userId: string, action: 'approve' | 'reject' | 'suspend') =>
    request<AdminRider>(`/admin/riders/${encodeURIComponent(userId)}`, { action }),
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
