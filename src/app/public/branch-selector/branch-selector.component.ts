import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BranchService } from '../../core/services/branch.service';
import { Branch } from '../../core/models/branch.model';

@Component({
  selector: 'app-branch-selector',
  standalone: true,
  templateUrl: './branch-selector.component.html',
  styleUrls: ['./branch-selector.component.scss'],
})
export class BranchSelectorComponent implements OnInit {
  private readonly branchService = inject(BranchService);
  private readonly router = inject(Router);

  readonly branches = this.branchService.branches;

  ngOnInit(): void {
    const activeBranches = this.branches();
    if (activeBranches.length === 1) {
      this.selectBranch(activeBranches[0]);
    }
  }

  selectBranch(branch: Branch): void {
    this.branchService.setActiveBranch(branch);
    this.router.navigate([`/${branch.slug}/menu`]);
  }
}
