import {Component, OnInit} from '@angular/core';
import {SvgIconComponent} from '../svg-icon/svg-icon.component';
import {ActivatedRoute, NavigationEnd, Router, RouterLink} from '@angular/router';
import {filter} from 'rxjs';
import {NgIf} from '@angular/common';

interface menuItem {
  label: string;
  icon: string;
  link: string;
  isActive: boolean;
  hideButton?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [
    SvgIconComponent,
    RouterLink,
    NgIf
  ],
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  buttonText = 'Новая задача';
  showButton = true;

  constructor(private router: Router,
              private activatedRoute: ActivatedRoute) {

  }

  menuItems: menuItem[] = [
    {
      label: 'Заявки в снабжение',
      icon: 'requests',
      link: '/supplies',
      isActive: true,
    },
    {
      label: 'Все задачи',
      icon: 'tasks',
      link: '/tasks',
      isActive: false,
    },
    {
      label: 'Мои задачи',
      icon: 'my-tasks',
      link: '/tasks/my',
      isActive: false,
    },
    {
      label: 'Настройки',
      icon: 'settings',
      link: '/settings',
      isActive: false,
      hideButton: true,
    },
    {
      label: 'Поддержка',
      icon: 'help',
      link: '/help',
      isActive: false,
      hideButton: true,
    }
  ];

  ngOnInit(): void {
    this.menuItems[0].isActive = true;

    this.showButton = !this.menuItems.find(item => item.isActive)?.hideButton;

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      let route = this.activatedRoute;
      while (route.firstChild) {
        route = route.firstChild;
      }

      route.data.subscribe(data => {
        this.buttonText = data['buttonText'] || 'Новая задача';
      });
    });
  }

  toggleActivate(selectedItem: menuItem): void {
    this.menuItems.forEach(item => item.isActive = false);
    selectedItem.isActive = true;

    this.showButton = !selectedItem.hideButton;
  }

  switchIcon(item: any): string {
    return item.isActive ? item.icon + '-active' : item.icon;
  }
}
