import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { BranchService } from '../../core/services/branch.service';
import { NotificationService } from '../../core/services/notification.service';
import { Product } from '../../core/models/product.model';
import { MenuSection } from '../../core/models/menu-section.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ProductFormComponent } from './product-form/product-form.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ConfirmDialogComponent, ProductFormComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  private readonly supabase: SupabaseClient = inject(SUPABASE_CLIENT);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);

  readonly sections = signal<MenuSection[]>([]);
  readonly selectedSectionId = signal<string | null>(null);
  readonly products = signal<Product[]>([]);
  readonly isLoading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly editingProduct = signal<Product | null | undefined>(undefined);

  constructor() {
    effect(() => {
      const branch = this.branchService.activeBranch();
      if (branch) {
        this.selectedSectionId.set(null);
        this.products.set([]);
        this.loadSections();
      }
    }, { allowSignalWrites: true });
  }

  async loadSections(): Promise<void> {
    const branch = this.branchService.activeBranch();
    if (!branch) return;

    const { data, error } = await this.supabase
      .from('menu_sections')
      .select('id, branch_id, name, display_order')
      .eq('branch_id', branch.id)
      .order('display_order', { ascending: true });

    if (error) {
      this.notificationService.show('Failed to load sections', 'error');
      return;
    }

    this.sections.set(data ?? []);

    // Auto-select first section if none selected
    if (!this.selectedSectionId() && (data ?? []).length > 0) {
      const firstId = data![0].id;
      this.selectedSectionId.set(firstId);
      await this.loadProducts(firstId);
    }
  }

  async loadProducts(sectionId: string): Promise<void> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('section_id', sectionId)
      .order('display_order', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      this.notificationService.show('Failed to load products', 'error');
      return;
    }

    this.products.set(data ?? []);
  }

  async onSectionChange(sectionId: string): Promise<void> {
    this.selectedSectionId.set(sectionId);
    await this.loadProducts(sectionId);
  }

  async toggleAvailability(product: Product): Promise<void> {
    const newValue = !product.is_available;

    const { error } = await this.supabase
      .from('products')
      .update({ is_available: newValue })
      .eq('id', product.id);

    if (error) {
      this.notificationService.show('Failed to update availability', 'error');
      return;
    }

    this.products.update((list) =>
      list.map((p) => (p.id === product.id ? { ...p, is_available: newValue } : p))
    );

    const label = newValue ? 'available' : 'unavailable';
    this.notificationService.show(`"${product.name}" marked as ${label}`, 'success');
  }

  async updateOrder(productId: string, newOrder: number): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .update({ display_order: newOrder })
      .eq('id', productId);

    if (error) {
      this.notificationService.show('Failed to update order', 'error');
      return;
    }

    this.products.update((list) =>
      list
        .map((p) => (p.id === productId ? { ...p, display_order: newOrder } : p))
        .sort((a, b) => a.display_order - b.display_order)
    );
  }

  confirmDelete(id: string): void {
    this.deletingId.set(id);
  }

  cancelDelete(): void {
    this.deletingId.set(null);
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      this.notificationService.show('Failed to delete product', 'error');
      return;
    }

    this.notificationService.show('Product deleted', 'success');
    this.deletingId.set(null);
    this.products.update((list) => list.filter((p) => p.id !== id));
  }

  onOrderChange(productId: string, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (!isNaN(value) && value >= 0) {
      this.updateOrder(productId, value);
    }
  }

  openCreateForm(): void {
    this.editingProduct.set(null);
  }

  openEditForm(product: Product): void {
    this.editingProduct.set(product);
  }

  closeForm(): void {
    this.editingProduct.set(undefined);
  }

  async onFormSaved(savedProduct: Product): Promise<void> {
    this.closeForm();
    const sectionId = this.selectedSectionId();
    if (sectionId) {
      await this.loadProducts(sectionId);
    }
    // Reload sections to refresh product counts
    await this.loadSections();
  }
}
