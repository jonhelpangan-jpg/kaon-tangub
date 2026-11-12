/**
 * Stores and menus come from shared/stores.json – edit that file to add,
 * change, feature or remove a store. See HOW-TO-UPDATE.md.
 */
import data from '../../shared/stores.json';

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  popular?: boolean;
};

export type MenuSection = { title: string; items: MenuItem[] };

export type Restaurant = {
  id: string;
  name: string;
  /** Promoted stores are listed first with a "Featured" badge. */
  featured?: boolean;
  cuisine: string;
  categories: string[];
  emoji: string;
  tint: string;
  promo?: string;
  /** Leave out for a new store with no ratings yet. */
  rating?: number;
  reviews?: number;
  etaMin: number;
  etaMax: number;
  deliveryFee: number;
  minOrder: number;
  location: { latitude: number; longitude: number };
  menu: MenuSection[];
};

export const categories: { id: string; label: string; emoji: string }[] = data.categories;

const all: Restaurant[] = data.stores;

/** Featured (promoted) stores first, otherwise in file order. */
export const restaurants: Restaurant[] = [...all.filter((r) => r.featured), ...all.filter((r) => !r.featured)];

export const getRestaurant = (id: string) => restaurants.find((r) => r.id === id);
