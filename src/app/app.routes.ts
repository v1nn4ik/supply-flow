import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { TasksPageComponent } from './pages/tasks-page/tasks-page.component';
import { MyTasksPageComponent } from './pages/my-tasks-page/my-tasks-page.component';
import { SuppliesPageComponent } from './pages/supplies-page/supplies-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { HelpPageComponent } from './pages/help-page/help-page.component';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { EmployeesPageComponent } from './pages/employees-page/employees-page.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { UserRoles } from './models/user.model';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: AuthPageComponent
  },
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'tasks',
        pathMatch: 'full'
      },
      {
        path: 'tasks',
        component: TasksPageComponent
      },
      {
        path: 'tasks/my',
        component: MyTasksPageComponent
      },
      {
        path: 'supplies',
        component: SuppliesPageComponent
      },
      {
        path: 'employees',
        component: EmployeesPageComponent,
        canActivate: [roleGuard],
        data: { roles: [UserRoles.ADMIN, UserRoles.MANAGER] }
      },
      {
        path: 'settings',
        component: SettingsPageComponent
      },
      {
        path: 'help',
        component: HelpPageComponent
      }
    ]
  }
];
