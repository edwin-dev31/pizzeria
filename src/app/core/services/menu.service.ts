import { computed, effect, inject, Injectable, signal, Signal } from '@angular/core';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { MenuSection } from '../models/menu-section.model';
import { BranchService } from './branch.service';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService: BranchService = inject(BranchService);

  private readonly _sections = signal<MenuSection[]>([]);
  private _channel: RealtimeChannel | null = null;

  /** Filters out sections that have no products with is_available = true */
  readonly sections: Signal<MenuSection[]> = computed(() =>
    this._sections().filter(
      (section) => section.products?.some((p) => p.is_available) ?? false
    )
  );

  constructor() {
    effect(() => {
      const branch = this.branchService.activeBranch();
      if (branch) {
        this.loadMenu(branch.id);
        this.subscribeToRealtime(branch.id);
      }
    }, { allowSignalWrites: true });
  }

  async loadMenu(branchId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('menu_sections')
      .select('*, products(*, images:product_images(*), variants:product_variants(*))')
      .eq('branch_id', branchId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Failed to load menu:', error.message);
      return;
    }

    this._sections.set(data ?? []);
  }

  subscribeToRealtime(branchId: string): void {
    this.unsubscribe();

    this._channel = this.supabase
      .channel(`menu:${branchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `branch_id=eq.${branchId}` },
        () => this.loadMenu(branchId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_sections', filter: `branch_id=eq.${branchId}` },
        () => this.loadMenu(branchId)
      )
      .subscribe();
  }

  unsubscribe(): void {
    if (this._channel) {
      this.supabase.removeChannel(this._channel);
      this._channel = null;
    }
  }
}
