import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { TaskService } from '../../services/task.service';
import { UserService, User } from '../../services/user.service';
import { Task } from '../../models/task.model';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
	selector: 'app-create-task-modal',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatDatepickerModule,
		MatInputModule,
		MatFormFieldModule,
		MatNativeDateModule,
		MatButtonToggleModule,
		MatSelectModule,
		MatOptionModule,
		MatIconModule,
		MatButtonModule,
		MatTooltipModule
	],
	templateUrl: './create-task-modal.component.html',
	styleUrls: ['./create-task-modal.component.scss']
})
export class CreateTaskModalComponent implements OnInit {
	@Output() taskCreated = new EventEmitter<Task>();
	@Output() closeModal = new EventEmitter<void>();

	users: User[] = [];
	today = new Date();
	minDate = new Date();
	minTime = '00:00';
	selectedTime = '00:00';
	newTag: string = '';
	tags: string[] = [];

	task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'> = {
		title: '',
		description: '',
		status: 'pending',
		priority: 'medium',
		dueDate: new Date(),
		assignedTo: '',
		tags: [],
		comments: [],
		attachments: [],
		history: [],
		estimatedTime: 0,
		actualTime: 0
	};

	validationError: string | null = null;

	constructor(
		private taskService: TaskService,
		private userService: UserService
	) {
		this.minDate.setHours(0, 0, 0, 0);
		this.today.setHours(0, 0, 0, 0);
		this.updateMinTime();
	}

	ngOnInit(): void {
		this.loadUsers();
	}

	updateMinTime(): void {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = (now.getMinutes() + 5).toString().padStart(2, '0');
		this.minTime = `${hours}:${minutes}`;

		if (this.task.dueDate && this.isToday(this.task.dueDate)) {
			const [hours, minutes] = this.selectedTime.split(':');
			const selectedDateTime = new Date(this.task.dueDate);
			selectedDateTime.setHours(parseInt(hours), parseInt(minutes));

			if (selectedDateTime < now) {
				this.selectedTime = this.minTime;
			}
		}
	}

	isToday(date: Date): boolean {
		const today = new Date();
		return date.getDate() === today.getDate() &&
			date.getMonth() === today.getMonth() &&
			date.getFullYear() === today.getFullYear();
	}

	onDateChange(event: MatDatepickerInputEvent<Date>): void {
		if (event.value) {
			const [hours, minutes] = this.selectedTime.split(':');
			const newDate = new Date(event.value);
			newDate.setHours(parseInt(hours), parseInt(minutes));
			this.task.dueDate = newDate;

			if (this.isToday(newDate)) {
				this.updateMinTime();
			}
		}
	}

	onTimeChange(): void {
		if (this.task.dueDate) {
			const [hours, minutes] = this.selectedTime.split(':');
			const newDate = new Date(this.task.dueDate);
			newDate.setHours(parseInt(hours), parseInt(minutes));
			this.task.dueDate = newDate;
		}
	}

	loadUsers(): void {
		this.userService.getUsers().subscribe({
			next: (users) => {
				this.users = users;
			},
			error: (error) => {
				console.error('Error loading users:', error);
				this.validationError = 'Ошибка при загрузке пользователей';
			}
		});
	}

	filterDate = (date: Date | null): boolean => {
		if (!date) return false;
		return date >= this.minDate;
	};

	addTag(): void {
		if (this.newTag.trim() && !this.tags.includes(this.newTag.trim())) {
			this.tags.push(this.newTag.trim());
			this.newTag = '';
		}
	}

	removeTag(tag: string): void {
		this.tags = this.tags.filter(t => t !== tag);
	}

	validateTask(): boolean {
		if (!this.task.title.trim()) {
			this.validationError = 'Название задачи обязательно';
			return false;
		}

		if (!this.task.dueDate) {
			this.validationError = 'Срок выполнения обязателен';
			return false;
		}

		if (!this.task.assignedTo) {
			this.validationError = 'Исполнитель обязателен';
			return false;
		}

		const estimatedTime = this.task.estimatedTime ?? 0;
		if (estimatedTime < 0) {
			this.validationError = 'Оценка времени не может быть отрицательной';
			return false;
		}

		this.validationError = null;
		return true;
	}

	prepareTaskData(): any {
		return {
			...this.task,
			tags: this.tags,
			dueDate: this.task.dueDate
		};
	}

	onSubmit(): void {
		if (!this.validateTask()) {
			return;
		}

		const taskData = this.prepareTaskData();
		this.taskService.createTask(taskData).subscribe({
			next: (createdTask) => {
				this.taskCreated.emit(createdTask);
				this.closeModal.emit();
			},
			error: (error) => {
				console.error('Error creating task:', error);
				this.validationError = 'Ошибка при создании задачи';
			}
		});
	}

	onClose(): void {
		this.closeModal.emit();
	}

	getUserFullName(user: User): string {
		return `${user.firstName} ${user.lastName}`;
	}
} 