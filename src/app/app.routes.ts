import { Routes } from '@angular/router';
import {SuppliesPageComponent} from './pages/supplies-page/supplies-page.component';
import {LayoutComponent} from './layout/layout.component';
import {TasksPageComponent} from './pages/tasks-page/tasks-page.component';
import {TaskCardComponent} from './task-card/task-card.component';
import {SettingsPageComponent} from './pages/settings-page/settings-page.component';
import {HelpPageComponent} from './pages/help-page/help-page.component';

export const routes: Routes = [
  {
    path: '', component: LayoutComponent, children: [
      {path: 'supplies', component: SuppliesPageComponent, data: { title: 'Заявки в снабжение', buttonText: 'Новая заявка' }},
      {path: 'tasks', component: TasksPageComponent, data: { title: 'Все задачи', buttonText: 'Новая задача' }},
      {path: 'tasks/my', component: TaskCardComponent, data: { title: 'Мои задачи', buttonText: 'Новая задача' }},
      {path: 'settings', component: SettingsPageComponent, data: { title: 'Настройки' }},
      {path: 'help', component: HelpPageComponent, data: { title: 'Поддержка' }},
    ]
  },

];
