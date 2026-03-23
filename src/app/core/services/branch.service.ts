import { inject, Injectable, signal, Signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { Branch } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);

  private readonly _branches = signal<Branch[]>([]);
  private readonly _activeBranch = signal<Branch | null>(null);

  readonly branches: Signal<Branch[]> = this._branches.asReadonly();
  readonly activeBranch: Signal<Branch | null> = this._activeBranch.asReadonly();

  constructor() {
    this.loadBranches();
  }

  async loadBranches(): Promise<void> {
    const { data, error } = await this.supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to load branches:', error.message);
      return;
    }

    const branches = data ?? [];
    this._branches.set(branches);

    // Auto-select first branch if none active yet
    if (!this._activeBranch() && branches.length > 0) {
      this._activeBranch.set(branches[0]);
    }
  }

  setActiveBranch(branch: Branch): void {
    this._activeBranch.set(branch);
  }
}
