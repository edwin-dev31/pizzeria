import { Injectable, Signal, computed, signal } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';
import { Branch } from '../models/branch.model';

const STORAGE_KEY = 'pizzeria_cart';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this._rehydrate());

  readonly items: Signal<CartItem[]> = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  );

  addItem(product: Product): void {
    this._items.update(items => {
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        return items.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...items, { product, quantity: 1 }];
    });
    this._persist();
  }

  removeItem(productId: string): void {
    this._items.update(items =>
      items
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0)
    );
    this._persist();
  }

  clear(): void {
    this._items.set([]);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  buildWhatsAppUrl(branch: Branch): string {
    const currency = branch.currency_symbol;
    const lines = this._items()
      .map(i => `- ${i.quantity}x ${i.product.name} — ${currency}${i.product.price}`)
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
