import { Product } from './product.model';
import { ProductVariant } from './product-variant.model';

export interface CartItem {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
}
