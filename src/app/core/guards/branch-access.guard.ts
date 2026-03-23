import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../app.config';
import { AuthService } from '../services/auth.service';

export const branchAccessGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const supabase = inject<SupabaseClient>(SUPABASE_CLIENT);
  const authService = inject(AuthService);
  const router = inject(Router);

  const session = authService.session();
  if (!session) {
    return router.createUrlTree(['/admin/login']);
  }

  const branchSlug: string = route.params['branchSlug'];
  if (!branchSlug) {
    return router.createUrlTree(['/admin']);
  }

  // Resolve branch id from slug
  const { data: branch } = await supabase
    .from('branches')
    .select('id')
    .eq('slug', branchSlug)
    .single();

  if (!branch) {
    return router.createUrlTree(['/admin']);
  }

  // Check if the current user has access to this branch
  const { data: role, error } = await supabase
    .from('admin_branch_roles')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('branch_id', branch.id)
    .maybeSingle();

  if (error || !role) {
    // 403 — redirect to admin's default branch dashboard
    return router.createUrlTree(['/admin']);
  }

  return true;
};
