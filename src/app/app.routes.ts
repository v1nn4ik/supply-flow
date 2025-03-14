import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { TasksPageComponent } from './pages/tasks-page/tasks-page.component';
import { SuppliesPageComponent } from './pages/supplies-page/supplies-page.component';
import { SettingsPageComponent } from './pages/settings-page/settings-page.component';
import { HelpPageComponent } from './pages/help-page/help-page.component';
import { AuthPageComponent } from './pages/auth-page/auth-page.component';
import { authGuard } from './guards/auth.guard';

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
        path: 'supplies',
        component: SuppliesPageComponent
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
