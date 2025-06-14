import { Component, OnInit, OnDestroy } from '@angular/core';
import { SvgIconComponent } from '../../shared/svg-icon/svg-icon.component';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { NgIf, NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import { ModalService, ModalType } from '../../services/modal.service';
import { UserRoles } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface menuItem {
	label: string;
	icon: string;
	link: string;
	hideButton?: boolean;
	buttonText?: string;
	roles?: string[]; // Разрешенные роли для этого пункта меню
}

@Component({
	selector: 'app-sidebar',
	imports: [
		SvgIconComponent,
		RouterLink,
		RouterLinkActive,
		NgIf,
		NgClass
	],
	templateUrl: './sidebar.component.html',
	standalone: true,
	styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
	userName: string = '';
	firstName: string = '';
	lastName: string = '';
	profilePhoto: string | null = null;
	buttonText = 'Создать заявку';
	showButton = true;
	serverUrl: string = environment.apiUrl.replace('/api', ''); // URL сервера для полного пути к изображениям
	currentMenuItem: menuItem | null = null;
	userRole: string | null = null;

	private userDataSubscription?: Subscription;
	private routerSubscription?: Subscription;

	constructor(private router: Router,
		private activatedRoute: ActivatedRoute,
		private userService: UserService,
		private modalService: ModalService,
		private authService: AuthService) {
	}

	menuItems: menuItem[] = [
		{
			label: 'Заявки в снабжение',
			icon: 'requests',
			link: '/app/supplies',
			hideButton: false,
			buttonText: 'Создать заявку'
		},
		// {
		// 	label: 'Все задачи',
		// 	icon: 'tasks',
		// 	link: '/app/tasks',
		// 	hideButton: false,
		// 	buttonText: 'Создать задачу'
		// },
		// {
		// 	label: 'Мои задачи',
		// 	icon: 'my-tasks',
		// 	link: '/app/tasks/my',
		// 	hideButton: false,
		// 	buttonText: 'Создать задачу'
		// },
		{
			label: 'Сотрудники',
			icon: 'users',
			link: '/app/employees',
			hideButton: true,
			roles: [UserRoles.ADMIN, UserRoles.MANAGER]
		},
		{
			label: 'Настройки',
			icon: 'settings',
			link: '/app/settings',
			hideButton: true
		},
		{
			label: 'Поддержка',
			icon: 'help',
			link: '/app/help',
			hideButton: true
		}
	];

	// Фильтруем меню только если роль - сотрудник и нам нужно скрыть какие-то пункты
	get filteredMenuItems(): menuItem[] {
		if (!this.userRole) {
			return this.menuItems;
		}
		
		return this.menuItems.filter(item => {
			// Если у пункта меню не указаны роли, показываем его всем
			if (!item.roles) {
				return true;
			}
			// Если указаны роли, проверяем доступ
			return item.roles.includes(this.userRole!);
		});
	}

	ngOnInit(): void {
		// Загрузить пользователя, если его нет
		if (!this.authService.getCurrentUser()) {
			this.authService.loadCurrentUser();
		}
		
		this.routerSubscription = this.router.events.pipe(
			filter(event => event instanceof NavigationEnd)
		).subscribe((event: any) => {
			this.updateCurrentMenuItem(event.url);
		});

		this.userDataSubscription = this.userService.userData$.subscribe(userData => {
			if (userData) {
				this.userName = `${userData.lastName} ${userData.firstName} ${userData.middleName}`.trim();
				this.lastName = userData.lastName;
				this.firstName = userData.firstName;
				this.profilePhoto = userData.profilePhoto || null;
				this.userRole = userData.role || null;
				
				// Обновляем пользователя в authService, если он не установлен
				if (!this.authService.getCurrentUser() && userData && userData.role) {
					// Создаем новый объект с необходимыми полями из models/user.model.ts
					const authUser = {
						_id: userData._id || 'temp-id',
						firstName: userData.firstName,
						lastName: userData.lastName,
						middleName: userData.middleName,
						email: userData.email || '',
						profilePhoto: userData.profilePhoto,
						birthDate: userData.birthDate,
						role: userData.role,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					};
					this.authService.setCurrentUser(authUser);
				}
			} else {
				// Попробуем получить пользователя из authService
				const authUser = this.authService.getCurrentUser();
				if (authUser) {
					this.userName = `${authUser.lastName} ${authUser.firstName} ${authUser.middleName || ''}`.trim();
					this.lastName = authUser.lastName;
					this.firstName = authUser.firstName;
					this.profilePhoto = authUser.profilePhoto || null;
					this.userRole = authUser.role || null;
				}
			}
		});
	}

	ngOnDestroy(): void {
		if (this.userDataSubscription) {
			this.userDataSubscription.unsubscribe();
		}

		if (this.routerSubscription) {
			this.routerSubscription.unsubscribe();
		}
	}

	private updateCurrentMenuItem(url: string): void {
		const currentMenuItem = this.filteredMenuItems.find(item => url === item.link);
		this.currentMenuItem = currentMenuItem || null;
		// Всегда показываем кнопку "Создать заявку"
		this.showButton = true;
		this.buttonText = 'Создать заявку';
	}

	onMenuItemClick(item: menuItem): void {
		this.currentMenuItem = item;
		// Всегда показываем кнопку "Создать заявку"
		this.showButton = true;
		this.buttonText = 'Создать заявку';
	}

	onButtonClick(): void {
			this.modalService.openModal(ModalType.CREATE_SUPPLY);
	}

	switchIcon(item: menuItem): string {
		const isActive = this.router.url === item.link;
		return isActive ? item.icon + '-active' : item.icon;
	}

	getInitials(): string {
		let initials = '';

		if (this.firstName) {
			initials += this.firstName.charAt(0);
		}

		if (this.lastName) {
			initials += this.lastName.charAt(0);
		}

		return initials.toUpperCase();
	}
}
