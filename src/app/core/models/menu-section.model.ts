import { Product } from './product.model';

export interface MenuSection {
  id: string;
  branch_id: string;
  name: string;
  display_order: number;
  products?: Product[];
}
