import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      { path: '', redirectTo: 'sections', pathMatch: 'full' },
      { path: 'dashboard', redirectTo: 'sections', pathMatch: 'full' },
      {
        path: 'sections',
        loadComponent: () =>
          import('./sections/sections.component').then((m) => m.SectionsComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./products/products.component').then((m) => m.ProductsComponent),
      },
      {
        path: 'theme-editor',
        loadComponent: () =>
          import('./theme-editor/theme-editor.component').then((m) => m.ThemeEditorComponent),
      },
      {
        path: 'branch-settings',
        loadComponent: () =>
          import('./branch-settings/branch-settings.component').then((m) => m.BranchSettingsComponent),
      },
    ],
  },
];
