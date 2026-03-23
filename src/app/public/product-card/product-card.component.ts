import { Component, computed, inject, input, output } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { CartService } from '../../core/services/cart.service';
import { BranchService } from '../../core/services/branch.service';
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
  readonly productSelected = output<Product>();

  private readonly cartService = inject(CartService);
  private readonly branchService = inject(BranchService);

  readonly cartQuantity = computed(() =>
    this.cartService.items()
      .filter(i => i.product.id === this.product().id)
      .reduce((sum, i) => sum + i.quantity, 0)
  );

  readonly hasVariants = computed(() => (this.product().variants?.length ?? 0) > 0);

  /** Price to show on the card: first variant price (personal) or base price */
  readonly displayPrice = computed(() => {
    const variants = this.product().variants;
    if (variants && variants.length > 0) {
      const sorted = [...variants].sort((a, b) => a.display_order - b.display_order);
      return sorted[0].price;
    }
    return this.product().price;
  });

  get currencySymbol(): string {
    return this.branchService.activeBranch()?.currency_symbol ?? '$';
  }

  select(): void {
    this.productSelected.emit(this.product());
  }
}
