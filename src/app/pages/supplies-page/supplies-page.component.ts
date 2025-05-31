import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyCardComponent } from '../../components/supply-card/supply-card.component';
import { CreateSupplyModalComponent } from '../../components/create-supply-modal/create-supply-modal.component';
import { SupplyDetailsModalComponent } from '../../components/supply-details-modal/supply-details-modal.component';
import { SupplyService, SupplyRequest, SupplyStatus, SupplyItem } from '../../services/supply.service';
import { WebsocketService } from '../../services/websocket.service';
import { ModalService, ModalType } from '../../services/modal.service';
import { UserService } from '../../services/user.service';
import { UserRoles } from '../../models/user.model';
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
  duplicateData: SupplyRequest | null = null;
  editData: SupplyRequest | null = null;
  error: string | null = null;
  userRole: string | null = null;
  isEmployee = false;
  currentUserId: string | null = null;

  // Фильтры
  statusFilter: string = '';
  priorityFilter: string = '';
  searchFilter: string = '';

  deadlineSort: string = 'deadline_asc';

  private supplyUpdateSubscription?: Subscription;
  private modalSubscription?: Subscription;
  private userSubscription?: Subscription;

  isSuppliesLoaded = false;

  constructor(
    private supplyService: SupplyService,
    private websocketService: WebsocketService,
    private modalService: ModalService,
    private userService: UserService,
    private zone: NgZone
  ) { }

  ngOnInit() {
    this.subscribeToUserData();
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
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private subscribeToUserData() {
    this.userSubscription = this.userService.userData$.subscribe(userData => {
      if (userData) {
        this.userRole = userData.role || null;
        this.isEmployee = userData.role === UserRoles.EMPLOYEE;
        this.currentUserId = userData._id || null;
        this.loadSupplies();
      }
    });
  }

  // Метод применения фильтров
  applyFilters() {
    this.filteredSupplies = this.supplies.filter(supply => {
      if (this.statusFilter && supply.status !== this.statusFilter) {
        return false;
      }
      if (this.priorityFilter && supply.priority !== this.priorityFilter) {
        return false;
      }
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

    // Фильтрация по сроку, если выбран специальный пункт сортировки
    const now = new Date();
    if (this.deadlineSort === 'overdue') {
      this.filteredSupplies = this.filteredSupplies.filter(supply => {
        const deadline = supply.deadline ? new Date(supply.deadline) : null;
        return deadline && deadline < now;
      });
    } else if (this.deadlineSort === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);
      this.filteredSupplies = this.filteredSupplies.filter(supply => {
        const deadline = supply.deadline ? new Date(supply.deadline) : null;
        return deadline && deadline >= startOfWeek && deadline <= endOfWeek;
      });
    } else if (this.deadlineSort === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      this.filteredSupplies = this.filteredSupplies.filter(supply => {
        const deadline = supply.deadline ? new Date(supply.deadline) : null;
        return deadline && deadline >= startOfMonth && deadline <= endOfMonth;
      });
    }

    this.applySort();
  }

  applySort() {
    if (this.deadlineSort === 'created_desc') {
      this.filteredSupplies.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.deadlineSort === 'created_asc') {
      this.filteredSupplies.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (this.deadlineSort === 'deadline_asc') {
      this.filteredSupplies.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
        return dateA - dateB;
      });
    } else if (this.deadlineSort === 'deadline_desc') {
      this.filteredSupplies.sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
        return dateB - dateA;
      });
    }
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
  openCreateModal(supplyToDuplicate?: SupplyRequest) {
    this.duplicateData = supplyToDuplicate || null;
    this.editData = null;
    this.showCreateModal = true;
    this.showDetailsModal = false;
  }

  openEditModal(supply: SupplyRequest) {
    this.editData = this.cloneSupply(supply);
    this.duplicateData = null;
    this.showCreateModal = true;
    this.showDetailsModal = false;
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.duplicateData = null;
    this.editData = null;
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

  handleUpdateSupply(event: { id: string, data: Partial<SupplyRequest> }) {
    this.clearError();
    this.supplyService.updateSupplyRequest(event.id, event.data).subscribe({
      next: (updatedSupply) => {
        this.closeCreateModal();
        this.updateSupplyInList(updatedSupply);
        this.applyFilters();
      },
      error: () => this.setError('update')
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

  handleToggleFavorite(event: { id: string, isFavorite: boolean }) {
    this.clearError();
    this.supplyService.updateSupplyRequest(event.id, { isFavorite: event.isFavorite }).subscribe({
      next: (updatedSupply) => {
        this.updateSupplyInList(updatedSupply);
        this.applyFilters();
      },
      error: () => this.setError('favorite')
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
        this.supplies = supplies;
        this.deadlineSort = 'created_desc';
        this.isSuppliesLoaded = true;
        this.applyFilters();
      },
      error: () => this.setError('load')
    });
  }

  private clearError() {
    this.error = null;
  }

  private setError(type: 'create' | 'status' | 'delete' | 'items' | 'load' | 'update' | 'favorite') {
    const errorMessages = {
      create: 'Произошла ошибка при создании заявки.',
      status: 'Произошла ошибка при обновлении статуса.',
      delete: 'Произошла ошибка при удалении заявки.',
      items: 'Произошла ошибка при обновлении статуса закупки.',
      load: 'Произошла ошибка при загрузке заявок. Пожалуйста, обновите страницу.',
      update: 'Произошла ошибка при обновлении заявки.',
      favorite: 'Произошла ошибка при обновлении статуса избранного.'
    };
    this.error = errorMessages[type] + ' Пожалуйста, попробуйте снова.';
  }
}
