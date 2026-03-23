export interface Branch {
  id: string;
  tenant_id: string;
  slug: string;
  display_name: string;
  whatsapp_number: string;
  currency_symbol: string;
  is_active: boolean;
  display_order: number;
  address?: string;
  description?: string;
  cover_image_url?: string;
  created_at?: string;
}
