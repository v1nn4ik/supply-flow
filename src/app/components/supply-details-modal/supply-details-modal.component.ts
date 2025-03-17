import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupplyRequest, SupplyStatus, SupplyItem } from '../../services/supply.service';

@Component({
  selector: 'app-supply-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supply-details-modal.component.html',
  styleUrls: ['./supply-details-modal.component.scss']
})
export class SupplyDetailsModalComponent {
  @Input() data!: SupplyRequest;
  @Output() close = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<{ id: string; status: SupplyStatus; callback?: (success: boolean) => void }>();
  @Output() itemUpdate = new EventEmitter<{ id: string; items: SupplyItem[]; callback?: (success: boolean) => void }>();

  statuses = [
    { value: 'new', label: 'Новая' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнена' },
    { value: 'cancelled', label: 'Отменена' }
  ];

  closeModal() {
    this.close.emit();
  }

  onStatusChange(newStatus: SupplyStatus) {
    const itemId = this.data.id || this.data._id;
    if (this.data && itemId && newStatus !== this.data.status) {
      // Сохраняем предыдущий статус для возможности отката
      const previousStatus = this.data.status;
      
      // Сразу обновляем UI
      this.data.status = newStatus;
      
      this.statusChange.emit({ 
        id: itemId, 
        status: newStatus,
        callback: (success: boolean) => {
          if (!success) {
            // Возвращаем предыдущий статус в случае ошибки
            this.data.status = previousStatus;
          }
        }
      });
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'new': return 'status-new';
      case 'in_progress': return 'status-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    const statusObj = this.statuses.find(s => s.value === status);
    return statusObj ? statusObj.label : 'Неизвестно';
  }

  getPriorityLabel(priority: string): string {
    const priorities: { [key: string]: string } = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return priorities[priority] || 'Неизвестно';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  onItemPurchasedChange(index: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const itemId = this.data.id || this.data._id;
    
    if (this.data && itemId) {
      // Сразу обновляем состояние в UI
      this.data.items[index].purchased = checkbox.checked;
      
      // Создаем копию массива предметов для отправки на сервер
      const updatedItems = this.data.items.map(item => ({ ...item }));
      
      this.itemUpdate.emit({ 
        id: itemId, 
        items: updatedItems,
        callback: (success: boolean) => {
          if (!success) {
            // Возвращаем предыдущее состояние только в случае ошибки
            this.data.items[index].purchased = !checkbox.checked;
          }
        }
      });
    }
  }
} 