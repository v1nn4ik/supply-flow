import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

// Типы событий модальных окон
export enum ModalType {
	CREATE_SUPPLY = 'CREATE_SUPPLY',
	CREATE_TASK = 'CREATE_TASK'
}

@Injectable({
	providedIn: 'root'
})
export class ModalService {
	// Источник события для открытия модального окна
	private modalOpenSource = new Subject<ModalType>();

	// Observable, который компоненты могут подписаться
	modalOpen$ = this.modalOpenSource.asObservable();

	constructor() { }

	// Метод для открытия модального окна определенного типа
	openModal(modalType: ModalType): void {
		this.modalOpenSource.next(modalType);
	}
} 