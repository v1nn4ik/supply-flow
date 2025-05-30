import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplyService, SupplyRequest, SupplyStatus } from '../../services/supply.service';
import { SupplyDetailsModalComponent } from '../supply-details-modal/supply-details-modal.component';
import { EditSupplyModalComponent } from '../edit-supply-modal/edit-supply-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-supply-list',
  standalone: true,
  imports: [CommonModule, SupplyDetailsModalComponent, EditSupplyModalComponent],
  templateUrl: './supply-list.component.html',
  styleUrls: ['./supply-list.component.scss']
})
export class SupplyListComponent implements OnInit {
  supplies: SupplyRequest[] = [];
  selectedSupply: SupplyRequest | null = null;
  showDetailsModal = false;
  showEditModal = false;
  userRole: string | null = null;

  constructor(
    private supplyService: SupplyService,
    private dialog: MatDialog,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.loadSupplies();
    this.userRole = this.userService.getUserData()?.role || null;
  }

  loadSupplies() {
    this.supplyService.getSupplyRequests().subscribe({
      next: (supplies) => {
        this.supplies = supplies;
      },
      error: (error) => {
        console.error('Ошибка при загрузке заявок:', error);
      }
    });
  }

  onSupplyClick(supply: SupplyRequest) {
    this.selectedSupply = supply;
    this.showDetailsModal = true;
  }

  onCloseDetails() {
    this.showDetailsModal = false;
    this.selectedSupply = null;
  }

  onEditSupply(supply: SupplyRequest) {
    console.log('Entering onEditSupply method', supply);
    console.log('onEditSupply called', supply);
    this.selectedSupply = supply;
    this.showDetailsModal = false;
    this.showEditModal = true;
  }

  onCloseEdit() {
    this.showEditModal = false;
    this.selectedSupply = null;
  }

  onSupplySaved(updatedSupply: SupplyRequest) {
    const index = this.supplies.findIndex(s => s.id === updatedSupply.id || s._id === updatedSupply._id);
    if (index !== -1) {
      this.supplies[index] = updatedSupply;
    }
    this.showEditModal = false;
    this.selectedSupply = null;
  }

  onStatusChange(event: { id: string; status: SupplyStatus; callback?: (success: boolean) => void }) {
    this.supplyService.updateSupplyStatus(event.id, event.status).subscribe({
      next: (updatedSupply) => {
        // Обновляем заявку в списке
        const index = this.supplies.findIndex(s => s.id === event.id || s._id === event.id);
        if (index !== -1) {
          this.supplies[index] = updatedSupply;
        }
        // Обновляем выбранную заявку
        if (this.selectedSupply && (this.selectedSupply.id === event.id || this.selectedSupply._id === event.id)) {
          this.selectedSupply = updatedSupply;
        }
        // Вызываем callback с успехом
        event.callback?.(true);
      },
      error: () => {
        // Вызываем callback с ошибкой
        event.callback?.(false);
      }
    });
  }

  getStatusClass(status: SupplyStatus | undefined): string {
    switch (status) {
      case 'new': return 'status-new';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: SupplyStatus | undefined): string {
    switch (status) {
      case 'new': return 'Новая';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Выполнена';
      case 'cancelled': return 'Отменена';
      default: return 'Неизвестно';
    }
  }
}
