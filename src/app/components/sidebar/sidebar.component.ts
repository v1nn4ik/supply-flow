import { Component, OnInit, OnDestroy } from '@angular/core';
import { SvgIconComponent } from '../../shared/svg-icon/svg-icon.component';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { NgIf, NgClass } from '@angular/common';
import { UserService } from '../../services/user.service';
import { ModalService, ModalType } from '../../services/modal.service';

interface menuItem {
	label: string;
	icon: string;
	link: string;
	hideButton?: boolean;
	buttonText?: string;
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
	serverUrl: string = 'http://localhost:3000'; // URL сервера для полного пути к изображениям
	currentMenuItem: menuItem | null = null;

	private userDataSubscription?: Subscription;
	private routerSubscription?: Subscription;

	constructor(private router: Router,
		private activatedRoute: ActivatedRoute,
		private userService: UserService,
		private modalService: ModalService) {
	}

	menuItems: menuItem[] = [
		{
			label: 'Заявки в снабжение',
			icon: 'requests',
			link: '/app/supplies',
			hideButton: false,
			buttonText: 'Создать заявку'
		},
		{
			label: 'Все задачи',
			icon: 'tasks',
			link: '/app/tasks',
			hideButton: false,
			buttonText: 'Создать задачу'
		},
		{
			label: 'Мои задачи',
			icon: 'my-tasks',
			link: '/app/tasks/my',
			hideButton: false,
			buttonText: 'Создать задачу'
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

	ngOnInit(): void {
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
		const currentMenuItem = this.menuItems.find(item => url === item.link);
		this.currentMenuItem = currentMenuItem || null;
		this.showButton = !currentMenuItem?.hideButton;
		if (currentMenuItem?.buttonText) {
			this.buttonText = currentMenuItem.buttonText;
		}
	}

	onMenuItemClick(item: menuItem): void {
		this.currentMenuItem = item;
		this.showButton = !item.hideButton;
		if (item.buttonText) {
			this.buttonText = item.buttonText;
		}
	}

	onButtonClick(): void {
		if (!this.currentMenuItem || !this.currentMenuItem.buttonText) {
			return;
		}

		if (this.currentMenuItem.link.includes('/supplies')) {
			this.modalService.openModal(ModalType.CREATE_SUPPLY);
		} else if (this.currentMenuItem.link.includes('/tasks')) {
			this.modalService.openModal(ModalType.CREATE_TASK);
		}
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
