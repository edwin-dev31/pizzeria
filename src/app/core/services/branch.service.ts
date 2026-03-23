import { inject, Injectable, Injector, signal, Signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { Branch } from '../models/branch.model';

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly injector: Injector = inject(Injector);

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

    // Lazy-get CartService via Injector to avoid circular dependency
    // (CartService → BranchService would create a cycle if injected at construction time)
    import('./cart.service').then(({ CartService }) => {
      this.injector.get(CartService).clear();
    }).catch(() => {
      // CartService not yet implemented (task 3.4) — safe to ignore
    });
  }
}
