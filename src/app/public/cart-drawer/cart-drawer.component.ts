import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, CurrencyFormatPipe],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
})
export class CartDrawerComponent {
  readonly cartService = inject(CartService);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);

  readonly externalOpen = input<boolean>(false);
  readonly drawerClosed = output<void>();

  readonly isOpen = signal(false);

  readonly cartCount = computed(() =>
    this.cartService.items().reduce((sum, i) => sum + i.quantity, 0)
  );

  constructor() {
    effect(() => {
      if (this.externalOpen()) this.isOpen.set(true);
    }, { allowSignalWrites: true });
  }

  open(): void  { this.isOpen.set(true); }

  close(): void {
    this.isOpen.set(false);
    this.drawerClosed.emit();
  }

  removeItem(productId: string, variantId: string | null = null): void {
    this.cartService.removeItem(productId, variantId);
  }

  addItem(product: any, variant: any = null): void {
    this.cartService.addItem(product, variant);
  }

  submitOrder(): void {
    const branch = this.branchService.activeBranch();
    if (!branch) {
      this.notificationService.show('No hay sucursal seleccionada', 'error');
      return;
    }
    const url = this.cartService.buildWhatsAppUrl(branch);
    window.open(url, '_blank');
  }

  get currencySymbol(): string {
    return this.branchService.activeBranch()?.currency_symbol ?? 'Q';
  }
}
