import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRoles } from '../models/user.model';

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  
  const user = authService.getCurrentUser();
  const allowedRoles = route.data?.['roles'] as UserRoles[];
  
  if (!user) {
    router.navigate(['/auth']);
    return false;
  }
  
  if (allowedRoles && allowedRoles.includes(user.role as UserRoles)) {
    return true;
  }
  
  router.navigate(['/app/tasks']);
  return false;
}; 