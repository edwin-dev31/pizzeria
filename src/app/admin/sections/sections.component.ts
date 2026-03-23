import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { BranchService } from '../../core/services/branch.service';
import { MenuService } from '../../core/services/menu.service';
import { NotificationService } from '../../core/services/notification.service';
import { MenuSection } from '../../core/models/menu-section.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

export interface SectionWithCount extends MenuSection {
  product_count: number;
}

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent],
  templateUrl: './sections.component.html',
  styleUrl: './sections.component.scss',
})
export class SectionsComponent {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService = inject(BranchService);
  private readonly menuService = inject(MenuService);
  private readonly notificationService = inject(NotificationService);

  readonly sections = signal<SectionWithCount[]>([]);
  readonly isAddingSection = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editingName = signal('');
  readonly newSectionName = signal('');
  readonly deletingId = signal<string | null>(null);
  readonly isLoading = signal(false);

  constructor() {
    effect(() => {
      const branch = this.branchService.activeBranch();
      if (branch) this.loadSections();
    }, { allowSignalWrites: true });
  }

  async loadSections(): Promise<void> {
    const branch = this.branchService.activeBranch();
    if (!branch) {
      // activeBranch not ready yet — wait for branches to load then retry
      const branches = this.branchService.branches();
      if (branches.length === 0) return;
      this.branchService.setActiveBranch(branches[0]);
      return;
    }

    this.isLoading.set(true);

    const { data, error } = await this.supabase
      .from('menu_sections')
      .select('*, products(id)')
      .eq('branch_id', branch.id)
      .order('display_order', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      console.error('loadSections error:', error);
      this.notificationService.show('Failed to load sections: ' + error.message, 'error');
      return;
    }

    const mapped: SectionWithCount[] = (data ?? []).map((s: any) => ({
      id: s.id,
      branch_id: s.branch_id,
      name: s.name,
      display_order: s.display_order,
      product_count: Array.isArray(s.products) ? s.products.length : 0,
    }));

    this.sections.set(mapped);
  }

  async addSection(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) return;

    const branch = this.branchService.activeBranch();
    if (!branch) return;

    const currentSections = this.sections();
    const nextOrder =
      currentSections.length > 0
        ? Math.max(...currentSections.map((s) => s.display_order)) + 1
        : 0;

    const { error } = await this.supabase.from('menu_sections').insert({
      branch_id: branch.id,
      name: trimmed,
      display_order: nextOrder,
    });

    if (error) {
      this.notificationService.show('Failed to add section', 'error');
      return;
    }

    this.notificationService.show(`Section "${trimmed}" added`, 'success');
    this.newSectionName.set('');
    this.isAddingSection.set(false);
    await this.loadSections();
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('menu_sections')
      .delete()
      .eq('id', id);

    if (error) {
      this.notificationService.show('Failed to delete section', 'error');
      return;
    }

    this.notificationService.show('Section deleted', 'success');
    this.deletingId.set(null);
    await this.loadSections();
  }

  async updateOrder(sectionId: string, newOrder: number): Promise<void> {
    const { error } = await this.supabase
      .from('menu_sections')
      .update({ display_order: newOrder })
      .eq('id', sectionId);

    if (error) {
      this.notificationService.show('Failed to update order', 'error');
      return;
    }

    this.sections.update((list) =>
      list
        .map((s) => (s.id === sectionId ? { ...s, display_order: newOrder } : s))
        .sort((a, b) => a.display_order - b.display_order)
    );
  }

  startEdit(section: SectionWithCount): void {
    this.editingId.set(section.id);
    this.editingName.set(section.name);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editingName.set('');
  }

  async saveEdit(sectionId: string): Promise<void> {
    const trimmed = this.editingName().trim();
    if (!trimmed) return;

    const { error } = await this.supabase
      .from('menu_sections')
      .update({ name: trimmed })
      .eq('id', sectionId);

    if (error) {
      this.notificationService.show('Failed to update section', 'error');
      return;
    }

    this.notificationService.show(`Section renamed to "${trimmed}"`, 'success');
    this.editingId.set(null);
    this.editingName.set('');
    await this.loadSections();
  }

  showAddForm(): void {
    this.isAddingSection.set(true);
    this.newSectionName.set('');
  }

  cancelAdd(): void {
    this.isAddingSection.set(false);
    this.newSectionName.set('');
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  onAddSubmit(): void {
    this.addSection(this.newSectionName());
  }

  onOrderChange(sectionId: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 0) {
      this.updateOrder(sectionId, value);
    }
  }
}
