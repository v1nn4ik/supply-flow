import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Task } from '../../models/task.model';

@Component({
	selector: 'app-task-history-dialog',
	standalone: true,
  imports: [CommonModule, MatDialogModule],
	template: `
    <h2 mat-dialog-title>История изменений задачи</h2>
    <mat-dialog-content>
      <div class="history-list">
        @for (change of data.task.history; track change._id) {
          <div class="history-item">
            <div class="history-header">
              <span class="timestamp">{{ change.timestamp | date:'dd.MM.yyyy HH:mm' }}</span>
              <span class="user">{{ change.user }}</span>
            </div>
            <div class="change-details">
              <span class="field">{{ getFieldLabel(change.field) }}:</span>
              <span class="old-value">{{ formatHistoryValue(change.field, change.oldValue) }}</span>
              <span class="arrow">→</span>
              <span class="new-value">{{ formatHistoryValue(change.field, change.newValue) }}</span>
            </div>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button (click)="onClose()">Закрыть</button>
    </mat-dialog-actions>
  `,
	styles: [`
    .history-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .history-item {
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .change-details {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .field {
      font-weight: 500;
      color: #333;
    }

    .old-value {
      color: #dc3545;
    }

    .new-value {
      color: #28a745;
    }

    .arrow {
      color: #666;
    }

    mat-dialog-actions {
      padding: 1rem;
    }
  `]
})
export class TaskHistoryDialogComponent {
	constructor(
		public dialogRef: MatDialogRef<TaskHistoryDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: { task: Task }
	) { }

	onClose(): void {
		this.dialogRef.close();
	}

	getFieldLabel(field: string): string {
		const labels: { [key: string]: string } = {
			title: 'Название',
			description: 'Описание',
			status: 'Статус',
			priority: 'Приоритет',
			dueDate: 'Срок',
			assignedTo: 'Исполнитель',
			estimatedTime: 'Оценка времени',
			actualTime: 'Фактическое время'
		};
		return labels[field] || field;
	}

	formatHistoryValue(field: string, value: any): string {
		if (value instanceof Date) {
			return value.toLocaleDateString();
		}

		switch (field) {
			case 'status':
				const statusLabels: { [key: string]: string } = {
					pending: 'В ожидании',
					in_progress: 'В работе',
					completed: 'Завершено',
					cancelled: 'Отменено'
				};
				return statusLabels[value] || value;

			case 'priority':
				const priorityLabels: { [key: string]: string } = {
					low: 'Низкий',
					medium: 'Средний',
					high: 'Высокий'
				};
				return priorityLabels[value] || value;

			case 'estimatedTime':
			case 'actualTime':
				return value ? `${value} ч.` : 'Не указано';

			case 'assignedTo':
				return value || 'Не назначен';

			default:
				return String(value || 'Не указано');
		}
	}
}
