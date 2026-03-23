import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { BranchService } from '../../core/services/branch.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);
  readonly branchService = inject(BranchService);

  onBranchChange(branchId: string): void {
    const branch = this.branchService.branches().find(b => b.id === branchId);
    if (branch) this.branchService.setActiveBranch(branch);
  }

  logout(): void {
    this.authService.logout();
  }
}
