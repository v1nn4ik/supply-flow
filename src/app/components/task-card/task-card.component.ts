import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { UserService, User } from '../../services/user.service';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TaskHistoryDialogComponent } from '../task-history-dialog/task-history-dialog.component';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

@Component({
	selector: 'app-task-card',
	standalone: true,
	imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatOptionModule],
	templateUrl: './task-card.component.html',
	styleUrls: ['./task-card.component.scss']
})
export class TaskCardComponent implements OnInit {
	@Input() task!: Task;
	@Output() taskDeleted = new EventEmitter<string>();
	@Output() taskUpdated = new EventEmitter<Task>();

	users: User[] = [];
	foods = [
		{ value: 'pizza', viewValue: 'Пицца' },
		{ value: 'tacos', viewValue: 'Тако' },
		{ value: 'sushi', viewValue: 'Суши' },
	];

	statuses: { value: TaskStatus; label: string }[] = [
		{ value: 'pending', label: 'В ожидании' },
		{ value: 'in_progress', label: 'В работе' },
		{ value: 'completed', label: 'Завершено' },
		{ value: 'cancelled', label: 'Отменено' }
	];

	fieldLabels: { [key: string]: string } = {
		title: 'Название',
		description: 'Описание',
		status: 'Статус',
		priority: 'Приоритет',
		dueDate: 'Срок',
		assignedTo: 'Исполнитель',
		estimatedTime: 'Оценка времени',
		actualTime: 'Фактическое время',
		tags: 'Теги'
	};

	constructor(
		private taskService: TaskService,
		private userService: UserService,
		private dialog: MatDialog
	) { }

	ngOnInit(): void {
		if (this.task.assignedTo) {
			this.loadUsers();
		}
	}

	loadUsers(): void {
		this.userService.getUsers().subscribe({
			next: (users) => {
				this.users = users;
			},
			error: (error) => {
				console.error('Error loading users:', error);
			}
		});
	}

	onDelete(): void {
		if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
			this.taskService.deleteTask(this.task._id!).subscribe({
				next: () => {
					this.taskDeleted.emit(this.task._id);
				},
				error: (error) => {
					console.error('Error deleting task:', error);
				}
			});
		}
	}

	onStatusChange(newStatus: TaskStatus): void {
		if (!this.task._id) return;

		this.task.status = newStatus;

		this.taskService.updateTask(this.task._id, { status: newStatus }).subscribe({
			next: (task) => {
				this.taskUpdated.emit(task);
			},
			error: (error) => {
				console.error('Error updating task status:', error);
			}
		});
	}

	getUserFullName(userId: string): string {
		const user = this.users.find(u => u._id === userId);
		return user ? `${user.firstName} ${user.lastName}` : userId;
	}

	getPriorityLabel(priority: string): string {
		const priorityMap: { [key: string]: string } = {
			'low': 'Низкий',
			'medium': 'Средний',
			'high': 'Высокий'
		};
		return priorityMap[priority] || priority;
	}

	getStatusLabel(status: string): string {
		const labels: { [key: string]: string } = {
			pending: 'В ожидании',
			in_progress: 'В работе',
			completed: 'Завершено',
			cancelled: 'Отменено'
		};
		return labels[status] || status;
	}

	getStatusClass(status: string): string {
		return `status-${status}`;
	}

	getPriorityClass(priority: string): string {
		return `priority-${priority}`;
	}

	formatFileSize(size: number): string {
		if (size < 1024) {
			return size + ' Б';
		} else if (size < 1024 * 1024) {
			return (size / 1024).toFixed(1) + ' КБ';
		} else if (size < 1024 * 1024 * 1024) {
			return (size / (1024 * 1024)).toFixed(1) + ' МБ';
		} else {
			return (size / (1024 * 1024 * 1024)).toFixed(1) + ' ГБ';
		}
	}

	getFieldLabel(field: string): string {
		return this.fieldLabels[field] || field;
	}

	formatHistoryValue(value: any): string {
		if (value === null || value === undefined) {
			return 'не указано';
		}

		if (typeof value === 'boolean') {
			return value ? 'Да' : 'Нет';
		}

		if (value instanceof Date) {
			return value.toLocaleString('ru-RU');
		}

		if (Array.isArray(value)) {
			return value.join(', ');
		}

		if (typeof value === 'object') {
			return JSON.stringify(value);
		}

		return String(value);
	}

	showHistory(): void {
		this.dialog.open(TaskHistoryDialogComponent, {
			width: '600px',
			data: { task: this.task }
		});
	}
}
