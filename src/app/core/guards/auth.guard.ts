import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SUPABASE_CLIENT } from '../../app.config';

export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SUPABASE_CLIENT);
  const router = inject(Router);

  const { data } = await supabase.auth.getSession();

  if (data.session) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};
