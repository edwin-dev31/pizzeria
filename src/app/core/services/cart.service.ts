import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { CartItem } from '../models/cart-item.model';
import { Product } from '../models/product.model';
import { ProductVariant } from '../models/product-variant.model';
import { Branch } from '../models/branch.model';
import { BranchService } from './branch.service';

const STORAGE_PREFIX = 'pizzeria_cart_';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly branchService = inject(BranchService);

  private readonly _items = signal<CartItem[]>([]);

  readonly items: Signal<CartItem[]> = this._items.asReadonly();

  readonly total = computed(() =>
    this._items().reduce((sum, item) => {
      const price = item.variant ? item.variant.price : item.product.price;
      return sum + price * item.quantity;
    }, 0)
  );

  constructor() {
    effect(() => {
      const branch = this.branchService.activeBranch();
      if (branch) {
        this._items.set(this._rehydrate(branch.id));
      }
    }, { allowSignalWrites: true });
  }

  private storageKey(branchId: string): string {
    return `${STORAGE_PREFIX}${branchId}`;
  }

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
    const branch = this.branchService.activeBranch();
    this._items.set([]);
    if (branch) localStorage.removeItem(this.storageKey(branch.id));
  }

  buildWhatsAppUrl(branch: Branch): string {
    const lines = this._items()
      .map(i => {
        const variantLabel = i.variant ? ` (${i.variant.name})` : '';
        return `- ${i.quantity}x ${i.product.name}${variantLabel}`;
      })
      .join('\n');
    const message =
      `Hola! Quiero hacer un pedido en ${branch.display_name}:\n\n${lines}`;
    return `https://wa.me/${branch.whatsapp_number}?text=${encodeURIComponent(message)}`;
  }

  private _persist(): void {
    const branch = this.branchService.activeBranch();
    if (!branch) return;
    localStorage.setItem(this.storageKey(branch.id), JSON.stringify(this._items()));
  }

  private _rehydrate(branchId: string): CartItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey(branchId));
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }
}
