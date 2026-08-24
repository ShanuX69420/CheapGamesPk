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
  is_featured: boolean;
  image: string | null;
}

export interface ProductDetail extends Product {
  categories: Category[];
  images: ProductImage[];
  banner: string | null;
  short_description: string;
  description: string;
  limitations: string;
  system_requirements: string;
  release_date: string | null;
  meta_title: string;
  meta_description: string;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  total_pages: number;
  page_size: number;
  results: T[];
}

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "delivered"
  | "cancelled"
  | "refunded";

export type OrderSource = "web" | "whatsapp";

export interface PaymentMethod {
  id: number;
  name: string;
  slug: string;
  instructions: string;
}

export interface OrderCredential {
  payload: string;
  instructions: string;
}

export interface OrderItem {
  id: number;
  product_name: string;
  product_slug: string;
  unit_price: string;
  quantity: number;
  line_total: string;
  /** Null until the order is delivered. */
  credentials: OrderCredential[] | null;
}

export interface Order {
  number: string;
  status: OrderStatus;
  status_display: string;
  source: OrderSource;
  customer_name: string;
  email: string;
  phone: string;
  payment_method: PaymentMethod | null;
  subtotal: string;
  total: string;
  currency: string;
  paid_at: string | null;
  delivered_at: string | null;
  customer_note: string;
  items: OrderItem[];
  whatsapp_url: string | null;
  created_at: string;
}

/** Only present on the create response — store it, it is the key to the order. */
export interface CreatedOrder extends Order {
  access_token: string;
}

export interface StoreConfig {
  currency: string;
  whatsapp_number: string | null;
  order_statuses: Record<string, string>;
}

export interface OrderLineInput {
  slug: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderLineInput[];
  source?: OrderSource;
}
