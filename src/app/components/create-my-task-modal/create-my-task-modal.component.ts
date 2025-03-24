import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from '../../services/user.service';
import { TaskService } from '../../services/task.service';
import { CreateTaskModalComponent } from '../create-task-modal/create-task-modal.component';
import { Task } from '../../models/task.model';

@Component({
	selector: 'app-create-my-task-modal',
	templateUrl: './create-my-task-modal.component.html',
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
	styleUrls: ['../create-task-modal/create-task-modal.component.scss']
})
export class CreateMyTaskModalComponent extends CreateTaskModalComponent implements OnInit {
	@Output() override taskCreated = new EventEmitter<Task>();
	@Output() override closeModal = new EventEmitter<void>();

	constructor(
		private userServiceExtended: UserService,
		userService: UserService,
		taskService: TaskService
	) {
		super(taskService, userService);
	}

	override ngOnInit(): void {
		// Вызываем родительский метод для базовой инициализации
		super.ngOnInit();

		// Устанавливаем текущего пользователя как исполнителя
		this.setCurrentUserAsAssignee();
	}

	private setCurrentUserAsAssignee(): void {
		this.userServiceExtended.getCurrentUser().subscribe({
			next: (user) => {
				if (user) {
					this.task.assignedTo = user._id;
				}
			},
			error: (error) => {
				console.error('Error getting current user:', error);
				this.validationError = 'Не удалось получить информацию о текущем пользователе';
			}
		});
	}

	override validateTask(): boolean {
		if (!this.task.title.trim()) {
			this.validationError = 'Название задачи обязательно';
			return false;
		}

		if (!this.task.dueDate) {
			this.validationError = 'Срок выполнения обязателен';
			return false;
		}

		// Исключаем проверку назначенного пользователя, т.к. это всегда текущий пользователь

		const estimatedTime = this.task.estimatedTime ?? 0;
		if (estimatedTime < 0) {
			this.validationError = 'Оценка времени не может быть отрицательной';
			return false;
		}

		this.validationError = null;
		return true;
	}
} 