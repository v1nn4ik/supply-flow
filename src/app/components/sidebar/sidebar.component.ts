import {Component, OnInit} from '@angular/core';
import {SvgIconComponent} from '../../shared/svg-icon/svg-icon.component';
import {ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive} from '@angular/router';
import {filter} from 'rxjs';
import {NgIf} from '@angular/common';
import {UserService} from '../../services/user.service';

interface menuItem {
  label: string;
  icon: string;
  link: string;
  hideButton?: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [
    SvgIconComponent,
    RouterLink,
    RouterLinkActive,
    NgIf
  ],
  templateUrl: './sidebar.component.html',
  standalone: true,
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  userName: string = '';
  buttonText = 'Создать заявку';
  showButton = true;

  constructor(private router: Router,
              private activatedRoute: ActivatedRoute,
              private userService: UserService) {
  }

  menuItems: menuItem[] = [
    {
      label: 'Заявки в снабжение',
      icon: 'requests',
      link: '/app/supplies',
      hideButton: false,
    },
    {
      label: 'Все задачи',
      icon: 'tasks',
      link: '/app/tasks',
      hideButton: false,
    },
    {
      label: 'Мои задачи',
      icon: 'my-tasks',
      link: '/app/tasks/my',
      hideButton: false,
    },
    {
      label: 'Настройки',
      icon: 'settings',
      link: '/app/settings',
      hideButton: true,
    },
    {
      label: 'Поддержка',
      icon: 'help',
      link: '/app/help',
      hideButton: true,
    }
  ];

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showButton = !this.menuItems.find(item => event.url === item.link)?.hideButton;
      
      let route = this.activatedRoute;
      while (route.firstChild) {
        route = route.firstChild;
      }

      route.data.subscribe(data => {
        this.buttonText = data['buttonText'] || 'Создать заявку';
      });
    });

    console.log('Subscribing to user data updates');
    this.userService.userData$.subscribe(userData => {
      console.log('Received user data update:', userData);
      if (userData) {
        this.userName = `${userData.lastName} ${userData.firstName} ${userData.middleName}`.trim();
        console.log('Updated user name:', this.userName);
      } else {
        console.log('No user data available');
      }
    });
  }

  onMenuItemClick(item: menuItem): void {
    this.showButton = !item.hideButton;
  }

  switchIcon(item: menuItem): string {
    const isActive = this.router.url === item.link;
    return isActive ? item.icon + '-active' : item.icon;
  }
}
