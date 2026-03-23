import { Component, computed, inject, input, output } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ImageCarouselComponent } from '../../shared/components/image-carousel/image-carousel.component';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CurrencyFormatPipe, ImageCarouselComponent],
  templateUrl: './product-detail-modal.component.html',
  styleUrl: './product-detail-modal.component.scss',
})
export class ProductDetailModalComponent {
  readonly product = input.required<Product>();
  readonly closed = output<void>();

  private readonly cartService = inject(CartService);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);

  readonly quantity = computed(() => {
    const item = this.cartService.items().find(i => i.product.id === this.product().id);
    return item?.quantity ?? 0;
  });

  get currencySymbol(): string {
    return this.branchService.activeBranch()?.currency_symbol ?? '$';
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pdm-backdrop')) {
      this.close();
    }
  }

  addToCart(): void {
    this.cartService.addItem(this.product());
    this.notificationService.show(`${this.product().name} agregado al carrito`, 'success');
  }

  removeFromCart(): void {
    this.cartService.removeItem(this.product().id);
  }
}
