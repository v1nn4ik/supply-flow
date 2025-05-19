import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplyRequest } from '../../services/supply.service';
import { UserRoles } from '../../models/user.model';

@Component({
  selector: 'app-supply-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-card.component.html',
  styleUrls: ['./supply-card.component.scss']
})
export class SupplyCardComponent {
  @Input() data!: SupplyRequest;
  @Input() userRole: string | null = null;
  @Input() currentUserId: string | null = null;
  @Output() viewDetails = new EventEmitter<SupplyRequest>();
  @Output() delete = new EventEmitter<string>();

  get isEmployee(): boolean {
    return this.userRole === UserRoles.EMPLOYEE;
  }

  get canManageSupply(): boolean {
    return this.userRole === UserRoles.ADMIN ||
      this.userRole === UserRoles.MANAGER ||
      this.userRole === UserRoles.SUPPLY_SPECIALIST;
  }

  get isCreatedByCurrentUser(): boolean {
    const createdById = this.data.createdBy?.userId;
    console.log('createdBy.userId:', createdById, 'currentUserId:', this.currentUserId);
    return (
      !!this.currentUserId &&
      createdById === this.currentUserId
    );
  }

  getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'new': 'Новая',
      'in_progress': 'В работе',
      'completed': 'Выполнена',
      'finalized': 'Завершена',
      'cancelled': 'Отменена'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  onViewDetails() {
    this.viewDetails.emit(this.data);
  }

  onDelete(event: Event) {
    event.stopPropagation();
    event.preventDefault();

    // Получаем id, проверяя разные форматы, которые могут быть в данных
    const itemId = this.data.id || this.data._id;

    if (itemId && confirm('Вы уверены, что хотите удалить эту заявку?')) {
      this.delete.emit(itemId);
    }
  }
}
