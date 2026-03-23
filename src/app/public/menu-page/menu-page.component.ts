import { Component, OnInit, inject } from '@angular/core';
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

  ngOnInit(): void {
    const branchSlug = this.route.snapshot.paramMap.get('branchSlug');
    if (!branchSlug) return;

    const branches = this.branchService.branches();
    const match = branches.find((b) => b.slug === branchSlug);

    if (match) {
      this.branchService.setActiveBranch(match);
    } else {
      // Branches may not be loaded yet — wait for them via effect-driven load
      // BranchService.loadBranches() is called in constructor; once resolved,
      // MenuService and ThemeService react via their effects on activeBranch.
      // Re-attempt after load completes.
      this.branchService.loadBranches().then(() => {
        const loaded = this.branchService.branches().find((b) => b.slug === branchSlug);
        if (loaded) {
          this.branchService.setActiveBranch(loaded);
        }
      });
    }
  }
}
