import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NgClass } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
	selector: 'app-layout',
	imports: [
		RouterOutlet,
		SidebarComponent,
		NgClass
	],
	templateUrl: './layout.component.html',
	standalone: true,
	styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
	isSidebarVisible = true;

	constructor(private authService: AuthService) {}

	ngOnInit(): void {
		// Убедимся, что данные пользователя загружены
		this.authService.loadCurrentUser();
	}

	toggleSidebar(): void {
		this.isSidebarVisible = !this.isSidebarVisible;
	}
}
