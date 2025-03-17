import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplyCardComponent } from '../../components/supply-card/supply-card.component';
import { CreateSupplyModalComponent } from '../../components/create-supply-modal/create-supply-modal.component';
import { SupplyDetailsModalComponent } from '../../components/supply-details-modal/supply-details-modal.component';
import { SupplyService, SupplyRequest, SupplyStatus, SupplyItem } from '../../services/supply.service';

@Component({
  selector: 'app-supplies-page',
  imports: [
    CommonModule,
    SupplyCardComponent,
    CreateSupplyModalComponent,
    SupplyDetailsModalComponent
  ],
  templateUrl: './supplies-page.component.html',
  standalone: true,
  styleUrl: './supplies-page.component.scss'
})
export class SuppliesPageComponent implements OnInit {
  showCreateModal = false;
  showDetailsModal = false;
  supplies: SupplyRequest[] = [];
  selectedSupply: SupplyRequest | null = null;
  error: string | null = null;

  constructor(private supplyService: SupplyService, private zone: NgZone) {}

  ngOnInit() {
    this.loadSupplies();
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
