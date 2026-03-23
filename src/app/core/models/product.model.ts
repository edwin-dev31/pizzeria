import { ProductImage } from './product-image.model';

export interface Product {
  id: string;
  section_id: string;
  branch_id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  display_order: number;
  images?: ProductImage[];
}
