import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full' },
  {
    path: '',
    loadComponent: () =>
      import('./public/branch-selector/branch-selector.component').then(
        (m) => m.BranchSelectorComponent
      ),
  },
  {
    path: ':branchSlug/menu',
    loadComponent: () =>
      import('./public/menu-page/menu-page.component').then(
        (m) => m.MenuPageComponent
      ),
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./admin/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
];
