import { Component, OnDestroy, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { Product } from '../../core/models/product.model';
import { ProductVariant } from '../../core/models/product-variant.model';
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
export class ProductDetailModalComponent implements OnInit, OnDestroy {
  readonly product = input.required<Product>();
  readonly closed = output<void>();

  private readonly cartService = inject(CartService);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);


  readonly selectedVariant = signal<ProductVariant | null>(null);

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  readonly hasVariants = computed(() => (this.product().variants?.length ?? 0) > 0);

  readonly sortedVariants = computed<ProductVariant[]>(() =>
    [...(this.product().variants ?? [])].sort((a, b) => a.price - b.price)
  );

  readonly activeVariant = computed<ProductVariant | null>(() => {
    if (!this.hasVariants()) return null;
    return this.selectedVariant() ?? (this.sortedVariants()[0] ?? null);
  });

  readonly displayPrice = computed(() =>
    this.activeVariant() ? this.activeVariant()!.price : this.product().price
  );

  readonly quantity = computed(() =>
    this.cartService.getQuantity(this.product().id, this.activeVariant()?.id ?? null)
  );

  get currencySymbol(): string {
    return this.branchService.activeBranch()?.currency_symbol ?? '$';
  }

  selectVariant(variant: ProductVariant): void {
    this.selectedVariant.set(variant);
  }

  close(): void {
    document.body.style.overflow = '';
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('pdm-backdrop')) {
      this.close();
    }
  }

  addToCart(): void {
    this.cartService.addItem(this.product(), this.activeVariant());
    const variantLabel = this.activeVariant() ? ` (${this.activeVariant()!.name})` : '';
    this.notificationService.show(`${this.product().name}${variantLabel} agregado al carrito`, 'success');
  }

  removeFromCart(): void {
    this.cartService.removeItem(this.product().id, this.activeVariant()?.id ?? null);
  }
}
