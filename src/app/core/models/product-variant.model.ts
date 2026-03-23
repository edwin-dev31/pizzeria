export enum VariantSize {
  Personal = 'PERSONAL',
  Pequena  = 'PEQUEÑA',
  Mediana  = 'MEDIANA',
  Gigante  = 'GIGANTE',
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: VariantSize;
  label: string | null;
  price: number;
  display_order: number;
}
