import { AfterViewInit, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BranchService } from '../../core/services/branch.service';
import { MenuService } from '../../core/services/menu.service';
import { ThemeService } from '../../core/services/theme.service';
import { CartService } from '../../core/services/cart.service';
import { MenuSectionComponent } from '../menu-section/menu-section.component';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer.component';
import { ProductDetailModalComponent } from '../product-detail-modal/product-detail-modal.component';
import { MenuSection } from '../../core/models/menu-section.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [MenuSectionComponent, CartDrawerComponent, ProductDetailModalComponent],
  templateUrl: './menu-page.component.html',
  styleUrls: ['./menu-page.component.scss'],
})
export class MenuPageComponent implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly branchService = inject(BranchService);
  readonly menuService = inject(MenuService);
  readonly themeService = inject(ThemeService);
  readonly cartService = inject(CartService);

  readonly activeBranch = this.branchService.activeBranch;
  readonly sections = this.menuService.sections;

  readonly cartOpen = signal(false);
  readonly activeSectionId = signal<string | null>(null);
  readonly selectedProduct = signal<Product | null>(null);

  readonly cartCount = computed(() =>
    this.cartService.items().reduce((sum, i) => sum + i.quantity, 0)
  );

  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const branchSlug = this.route.snapshot.paramMap.get('branchSlug');
    if (!branchSlug) return;

    const branches = this.branchService.branches();
    const match = branches.find((b) => b.slug === branchSlug);

    if (match) {
      this.branchService.setActiveBranch(match);
    } else {
      this.branchService.loadBranches().then(() => {
        const loaded = this.branchService.branches().find((b) => b.slug === branchSlug);
        if (loaded) this.branchService.setActiveBranch(loaded);
      });
    }
  }

  ngAfterViewInit(): void {
    // Observe sections for active nav pill highlight
    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the one closest to top
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          this.activeSectionId.set(top.target.id.replace('section-', ''));
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    // Observe after sections load (slight delay)
    setTimeout(() => this.observeSections(), 500);
  }

  private observeSections(): void {
    this.sections().forEach(s => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) this.observer?.observe(el);
    });
    if (this.sections().length > 0) {
      this.activeSectionId.set(this.sections()[0].id);
    }
  }

  scrollToSection(section: MenuSection): void {
    this.activeSectionId.set(section.id);
    const el = document.getElementById(`section-${section.id}`);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 112;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  openProduct(product: Product): void {
    this.selectedProduct.set(product);
  }

  closeProduct(): void {
    this.selectedProduct.set(null);
  }
}
