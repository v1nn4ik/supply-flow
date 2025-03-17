import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupplyRequest } from '../../services/supply.service';

@Component({
  selector: 'app-supply-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supply-card.component.html',
  styleUrls: ['./supply-card.component.scss']
})
export class SupplyCardComponent {
  @Input() data!: SupplyRequest;
  @Output() viewDetails = new EventEmitter<SupplyRequest>();
  @Output() delete = new EventEmitter<string>();

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
