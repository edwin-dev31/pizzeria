import { Component, inject, input } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ImageCarouselComponent } from '../../shared/components/image-carousel/image-carousel.component';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyFormatPipe, ImageCarouselComponent],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  private readonly cartService = inject(CartService);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);

  get currencySymbol(): string {
    return this.branchService.activeBranch()?.currency_symbol ?? '$';
  }

  addToCart(): void {
    this.cartService.addItem(this.product());
    this.notificationService.show(
      `${this.product().name} agregado al carrito`,
      'success'
    );
  }
}
