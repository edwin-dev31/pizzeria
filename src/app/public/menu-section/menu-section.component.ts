import { Component, computed, input } from '@angular/core';
import { MenuSection } from '../../core/models/menu-section.model';
import { Product } from '../../core/models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-menu-section',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './menu-section.component.html',
  styleUrls: ['./menu-section.component.scss'],
})
export class MenuSectionComponent {
  readonly section = input.required<MenuSection>();

  readonly availableProducts = computed<Product[]>(() =>
    (this.section().products ?? []).filter((p) => p.is_available)
  );

  readonly hasAvailableProducts = computed<boolean>(
    () => this.availableProducts().length > 0
  );
}
