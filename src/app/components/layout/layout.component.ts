import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NgClass } from '@angular/common';

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
export class LayoutComponent {
	isSidebarVisible = true;

	toggleSidebar(): void {
		this.isSidebarVisible = !this.isSidebarVisible;
	}
}
