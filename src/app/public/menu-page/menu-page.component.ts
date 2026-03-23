import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BranchService } from '../../core/services/branch.service';
import { MenuService } from '../../core/services/menu.service';
import { ThemeService } from '../../core/services/theme.service';
import { CartService } from '../../core/services/cart.service';
import { MenuSectionComponent } from '../menu-section/menu-section.component';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [MenuSectionComponent, CartDrawerComponent],
  templateUrl: './menu-page.component.html',
  styleUrls: ['./menu-page.component.scss'],
})
export class MenuPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly branchService = inject(BranchService);
  readonly menuService = inject(MenuService);
  readonly themeService = inject(ThemeService);
  readonly cartService = inject(CartService);

  readonly activeBranch = this.branchService.activeBranch;
  readonly sections = this.menuService.sections;

  /** Controls cart drawer open state from the header button */
  readonly cartOpen = signal(false);

  /** Total item count for the badge */
  readonly cartCount = computed(() =>
    this.cartService.items().reduce((sum, i) => sum + i.quantity, 0)
  );

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
}
