import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyCardComponent } from '../../components/supply-card/supply-card.component';
import { CreateSupplyModalComponent } from '../../components/create-supply-modal/create-supply-modal.component';
import { SupplyDetailsModalComponent } from '../../components/supply-details-modal/supply-details-modal.component';
import { SupplyService, SupplyRequest, SupplyStatus, SupplyItem } from '../../services/supply.service';
import { WebsocketService } from '../../services/websocket.service';
import { ModalService, ModalType } from '../../services/modal.service';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-supplies-page',
	imports: [
		CommonModule,
		FormsModule,
		SupplyCardComponent,
		CreateSupplyModalComponent,
		SupplyDetailsModalComponent
	],
	templateUrl: './supplies-page.component.html',
	standalone: true,
	styleUrl: './supplies-page.component.scss'
})
export class SuppliesPageComponent implements OnInit, OnDestroy {
	showCreateModal = false;
	showDetailsModal = false;
	supplies: SupplyRequest[] = [];
	filteredSupplies: SupplyRequest[] = [];
	selectedSupply: SupplyRequest | null = null;
	error: string | null = null;

	// Фильтры
	statusFilter: string = '';
	priorityFilter: string = '';
	searchFilter: string = '';

	private supplyUpdateSubscription?: Subscription;
	private modalSubscription?: Subscription;

	constructor(
		private supplyService: SupplyService,
		private websocketService: WebsocketService,
		private modalService: ModalService,
		private zone: NgZone
	) { }

	ngOnInit() {
		this.loadSupplies();
		this.setupWebSocket();
		this.subscribeToModalEvents();
	}

	ngOnDestroy() {
		if (this.supplyUpdateSubscription) {
			this.supplyUpdateSubscription.unsubscribe();
		}
		if (this.modalSubscription) {
			this.modalSubscription.unsubscribe();
		}
	}

	// Метод применения фильтров
	applyFilters() {
		this.filteredSupplies = this.supplies.filter(supply => {
			// Фильтр по статусу
			if (this.statusFilter && supply.status !== this.statusFilter) {
				return false;
			}

			// Фильтр по приоритету
			if (this.priorityFilter && supply.priority !== this.priorityFilter) {
				return false;
			}

			// Поисковый фильтр
			if (this.searchFilter) {
				const searchTerm = this.searchFilter.toLowerCase();
				const titleMatch = supply.title.toLowerCase().includes(searchTerm);
				const descMatch = supply.description.toLowerCase().includes(searchTerm);
				if (!titleMatch && !descMatch) {
					return false;
				}
			}

			return true;
		});
	}

	private setupWebSocket() {
		this.supplyUpdateSubscription = this.websocketService.onSupplyUpdate().subscribe({
			next: (updatedSupply) => {
				if (updatedSupply.deleted) {
					// Удаляем заявку из списка
					this.supplies = this.supplies.filter(s =>
						this.getSupplyId(s) !== this.getSupplyId(updatedSupply)
					);
					// Если удалена текущая открытая заявка, закрываем модальное окно
					if (this.selectedSupply &&
						this.getSupplyId(this.selectedSupply) === this.getSupplyId(updatedSupply)) {
						this.closeDetailsModal();
					}
				} else {
					// Обновляем или добавляем заявку в список
					const index = this.supplies.findIndex(s =>
						this.getSupplyId(s) === this.getSupplyId(updatedSupply)
					);
					if (index !== -1) {
						this.supplies[index] = updatedSupply;
					} else {
						this.supplies = [updatedSupply, ...this.supplies];
					}
					// Если это текущая открытая заявка, обновляем её
					if (this.selectedSupply &&
						this.getSupplyId(this.selectedSupply) === this.getSupplyId(updatedSupply)) {
						this.selectedSupply = updatedSupply;
					}
				}
				// Применяем фильтры после обновления списка заявок
				this.applyFilters();
			},
			error: (error) => {
				console.error('Ошибка при получении обновлений заявок:', error);
			}
		});
	}

	private subscribeToModalEvents() {
		this.modalSubscription = this.modalService.modalOpen$.subscribe(modalType => {
			if (modalType === ModalType.CREATE_SUPPLY) {
				this.openCreateModal();
			}
		});
	}

	// Методы для работы с модальными окнами
	openCreateModal() {
		this.showCreateModal = true;
		this.clearError();
	}

	closeCreateModal() {
		this.showCreateModal = false;
	}

	openDetailsModal(supply: SupplyRequest) {
		this.selectedSupply = this.cloneSupply(supply);
		this.showDetailsModal = true;
		this.clearError();
	}

	closeDetailsModal() {
		this.showDetailsModal = false;
		this.selectedSupply = null;
	}

	// Обработчики событий
	handleCreateSupply(supplyData: Omit<SupplyRequest, 'id'>) {
		this.clearError();
		this.supplyService.createSupplyRequest(supplyData).subscribe({
			next: () => {
				this.closeCreateModal();
				this.loadSupplies();
			},
			error: () => this.setError('create')
		});
	}

	handleStatusChange(event: { id: string, status: SupplyStatus }) {
		this.clearError();
		this.supplyService.updateSupplyRequest(event.id, { status: event.status }).subscribe({
			next: (updatedSupply) => {
				this.updateSupplyInList(updatedSupply);
				this.applyFilters();
			},
			error: () => this.setError('status')
		});
	}

	handleDeleteSupply(id: string) {
		this.clearError();
		this.supplyService.deleteSupplyRequest(id).subscribe({
			next: () => {
				this.zone.run(() => {
					this.removeSupplyFromList(id);
					this.applyFilters();
				});
			},
			error: () => {
				this.zone.run(() => this.setError('delete'));
			}
		});
	}

	handleItemUpdate(event: { id: string, items: SupplyItem[], callback?: (success: boolean) => void }) {
		this.clearError();
		this.supplyService.updateSupplyRequest(event.id, { items: event.items }).subscribe({
			next: (updatedSupply) => {
				this.updateSupplyInList(updatedSupply);
				this.applyFilters();
				event.callback?.(true);
			},
			error: (error) => {
				console.error('Error updating supply items:', error);
				this.setError('items');
				event.callback?.(false);
			}
		});
	}

	// Вспомогательные методы
	private getSupplyId(supply: SupplyRequest): string {
		return supply.id || supply._id || '';
	}

	private cloneSupply(supply: SupplyRequest): SupplyRequest {
		return {
			...supply,
			items: supply.items.map(item => ({
				name: item.name,
				quantity: item.quantity,
				unit: item.unit,
				purchased: item.purchased
			}))
		};
	}

	private updateSupplyInList(updatedSupply: SupplyRequest) {
		const updatedId = this.getSupplyId(updatedSupply);
		this.supplies = this.supplies.map(supply =>
			this.getSupplyId(supply) === updatedId ? this.cloneSupply(updatedSupply) : this.cloneSupply(supply)
		);

		if (this.selectedSupply && this.getSupplyId(this.selectedSupply) === updatedId) {
			this.selectedSupply = this.cloneSupply(updatedSupply);
		}
	}

	private removeSupplyFromList(id: string) {
		this.supplies = this.supplies.filter(supply => this.getSupplyId(supply) !== id);

		if (this.selectedSupply && this.getSupplyId(this.selectedSupply) === id) {
			this.closeDetailsModal();
		}
	}

	private loadSupplies() {
		this.clearError();
		this.supplyService.getSupplyRequests().subscribe({
			next: (supplies) => {
				this.supplies = supplies.map(supply => this.cloneSupply(supply));
				this.applyFilters();
			},
			error: () => this.setError('load')
		});
	}

	private clearError() {
		this.error = null;
	}

	private setError(type: 'create' | 'status' | 'delete' | 'items' | 'load') {
		const errorMessages = {
			create: 'Произошла ошибка при создании заявки.',
			status: 'Произошла ошибка при обновлении статуса.',
			delete: 'Произошла ошибка при удалении заявки.',
			items: 'Произошла ошибка при обновлении статуса закупки.',
			load: 'Произошла ошибка при загрузке заявок. Пожалуйста, обновите страницу.'
		};
		this.error = errorMessages[type] + ' Пожалуйста, попробуйте снова.';
	}
}
