export type ProductType =
  | "offline_account"
  | "online_account"
  | "key"
  | "subscription"
  | "other";

export interface Platform {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  description?: string;
  product_count?: number;
}

export interface ProductImage {
  id: number;
  image: string;
  alt_text: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  product_type: ProductType;
  product_type_display: string;
  platform: Platform | null;
  region: string;
  price: string;
  compare_at_price: string | null;
  discount_percent: number;
  is_on_sale: boolean;
  in_stock: boolean;
  is_featured: boolean;
  image: string | null;
}

export interface ProductDetail extends Product {
  categories: Category[];
  images: ProductImage[];
  short_description: string;
  description: string;
  limitations: string;
  system_requirements: string;
  release_date: string | null;
  stock_count: number;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
