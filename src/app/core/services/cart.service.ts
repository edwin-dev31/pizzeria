import { Injectable, Signal, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';
import { ProductVariant } from '../models/product-variant.model';
import { Branch } from '../models/branch.model';

const STORAGE_KEY = 'pizzeria_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this._rehydrate());

  readonly items: Signal<CartItem[]> = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + price * item.quantity;
    }, 0)
  );

  private itemKey(productId: string, variantId: string | null): string {
    return variantId ? `${productId}__${variantId}` : productId;
  }

  addItem(product: Product, variant: ProductVariant | null = null): void {
    const key = this.itemKey(product.id, variant?.id ?? null);
    this._items.update(items => {
      const existing = items.find(i => this.itemKey(i.product.id, i.variant?.id ?? null) === key);
      if (existing) {
        return items.map(i =>
          this.itemKey(i.product.id, i.variant?.id ?? null) === key
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...items, { product, variant, quantity: 1 }];
    });
    this._persist();
  }

  removeItem(productId: string, variantId: string | null = null): void {
    const key = this.itemKey(productId, variantId);
    this._items.update(items =>
      items
        .map(i =>
          this.itemKey(i.product.id, i.variant?.id ?? null) === key
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter(i => i.quantity > 0)
    );
    this._persist();
  }

  getQuantity(productId: string, variantId: string | null = null): number {
    const key = this.itemKey(productId, variantId);
    return this._items().find(i => this.itemKey(i.product.id, i.variant?.id ?? null) === key)?.quantity ?? 0;
  }

  clear(): void {
    this._items.set([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  buildWhatsAppUrl(branch: Branch): string {
    const currency = branch.currency_symbol;
    const lines = this._items()
      .map(i => {
        const price = i.variant ? i.variant.price : i.product.price;
        const variantLabel = i.variant ? ` (${i.variant.name})` : '';
        return `- ${i.quantity}x ${i.product.name}${variantLabel} — ${currency}${price}`;
      })
      .join('\n');
    const message =
      `Hola! Quiero hacer un pedido en ${branch.display_name}:\n\n` +
      `${lines}\n\n` +
      `*Total: ${currency}${this.total()}*`;
    return `https://wa.me/${branch.whatsapp_number}?text=${encodeURIComponent(message)}`;
  }

  private _persist(): void {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this._items()));
  }

  private _rehydrate(): CartItem[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
