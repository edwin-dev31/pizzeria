import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BranchService } from '../../core/services/branch.service';
import { Branch } from '../../core/models/branch.model';

@Component({
  selector: 'app-branch-selector',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './branch-selector.component.html',
  styleUrls: ['./branch-selector.component.scss'],
})
export class BranchSelectorComponent implements OnInit {
  private readonly branchService = inject(BranchService);
  private readonly router = inject(Router);

  readonly branches = this.branchService.branches;
  readonly activeBranch = this.branchService.activeBranch;
  readonly loading = signal(true);
  readonly skeletonItems = [1, 2, 3];

  ngOnInit(): void {
    const active = this.branches();
    if (active.length > 0) {
      this.loading.set(false);
      if (active.length === 1) this.selectBranch(active[0]);
    } else {
      this.branchService.loadBranches().then(() => {
        this.loading.set(false);
        const loaded = this.branches();
        if (loaded.length === 1) this.selectBranch(loaded[0]);
      });
    }
  }

  selectBranch(branch: Branch): void {
    this.branchService.setActiveBranch(branch);
    this.router.navigate([`/${branch.slug}/menu`]);
  }
}
