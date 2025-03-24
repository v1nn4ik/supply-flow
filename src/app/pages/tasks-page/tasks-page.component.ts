import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CreateTaskModalComponent } from '../../components/create-task-modal/create-task-modal.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { WebsocketService } from '../../services/websocket.service';
import { ModalService, ModalType } from '../../services/modal.service';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-tasks-page',
	imports: [
		CommonModule,
		FormsModule,
		CreateTaskModalComponent,
		TaskCardComponent
	],
	templateUrl: './tasks-page.component.html',
	standalone: true,
	styleUrl: './tasks-page.component.scss'
})
export class TasksPageComponent implements OnInit, OnDestroy {
	showCreateTaskModal = false;
	tasks: Task[] = [];
	filteredTasks: Task[] = [];
	loading = false;
	error: string | null = null;

	// Фильтры
	statusFilter: string = '';
	priorityFilter: string = '';
	searchFilter: string = '';

	private taskUpdateSubscription?: Subscription;
	private newTaskSubscription?: Subscription;
	private taskDeleteSubscription?: Subscription;
	private modalSubscription?: Subscription;

	constructor(
		private taskService: TaskService,
		private websocketService: WebsocketService,
		private modalService: ModalService
	) { }

	ngOnInit(): void {
		this.loadTasks();
		this.setupWebSocket();
		this.subscribeToModalEvents();
	}

	ngOnDestroy(): void {
		if (this.taskUpdateSubscription) {
			this.taskUpdateSubscription.unsubscribe();
		}
		if (this.newTaskSubscription) {
			this.newTaskSubscription.unsubscribe();
		}
		if (this.taskDeleteSubscription) {
			this.taskDeleteSubscription.unsubscribe();
		}
		if (this.modalSubscription) {
			this.modalSubscription.unsubscribe();
		}
	}

	// Метод применения фильтров
	applyFilters(): void {
		this.filteredTasks = this.tasks.filter(task => {
			// Фильтр по статусу
			if (this.statusFilter && task.status !== this.statusFilter) {
				return false;
			}

			// Фильтр по приоритету
			if (this.priorityFilter && task.priority !== this.priorityFilter) {
				return false;
			}

			// Поисковый фильтр
			if (this.searchFilter) {
				const searchTerm = this.searchFilter.toLowerCase();
				const titleMatch = task.title.toLowerCase().includes(searchTerm);
				const descMatch = task.description.toLowerCase().includes(searchTerm);
				if (!titleMatch && !descMatch) {
					return false;
				}
			}

			return true;
		});
	}

	private setupWebSocket(): void {
		// Подписка на обновления задач
		this.taskUpdateSubscription = this.websocketService.onTaskUpdate().subscribe({
			next: (updatedTask) => {
				this.tasks = this.tasks.map(task =>
					task._id === updatedTask._id ? updatedTask : task
				);
				this.applyFilters();
			},
			error: (error) => {
				console.error('Ошибка при получении обновлений задач:', error);
			}
		});

		// Подписка на новые задачи
		this.newTaskSubscription = this.websocketService.onNewTask().subscribe({
			next: (newTask) => {
				this.tasks = [newTask, ...this.tasks];
				this.applyFilters();
			},
			error: (error) => {
				console.error('Ошибка при получении новой задачи:', error);
			}
		});

		// Подписка на удаление задач
		this.taskDeleteSubscription = this.websocketService.onTaskDelete().subscribe({
			next: (taskId) => {
				this.tasks = this.tasks.filter(task => task._id !== taskId);
				this.applyFilters();
			},
			error: (error) => {
				console.error('Ошибка при получении уведомления об удалении задачи:', error);
			}
		});
	}

	private subscribeToModalEvents(): void {
		this.modalSubscription = this.modalService.modalOpen$.subscribe(modalType => {
			if (modalType === ModalType.CREATE_TASK) {
				this.openCreateTaskModal();
			}
		});
	}

	loadTasks(): void {
		this.loading = true;
		this.error = null;
		this.taskService.getTasks().subscribe({
			next: (tasks) => {
				this.tasks = tasks;
				this.applyFilters();
				this.loading = false;
			},
			error: (error) => {
				console.error('Error loading tasks:', error);
				this.error = 'Ошибка при загрузке задач';
				this.loading = false;
			}
		});
	}

	onTaskCreated(): void {
		this.showCreateTaskModal = false;
		this.loadTasks();
	}

	onTaskDeleted(taskId: string): void {
		this.tasks = this.tasks.filter(task => task._id !== taskId);
		this.applyFilters();
	}

	onTaskUpdated(updatedTask: Task): void {
		this.tasks = this.tasks.map(task =>
			task._id === updatedTask._id ? updatedTask : task
		);
		this.applyFilters();
	}

	onCloseModal(): void {
		this.showCreateTaskModal = false;
	}

	openCreateTaskModal(): void {
		this.showCreateTaskModal = true;
	}

	getStatusText(status: string): string {
		const statusMap: { [key: string]: string } = {
			'pending': 'Ожидает',
			'in_progress': 'В работе',
			'completed': 'Завершена'
		};
		return statusMap[status] || status;
	}

	getPriorityText(priority: string): string {
		const priorityMap: { [key: string]: string } = {
			'low': 'Низкий',
			'medium': 'Средний',
			'high': 'Высокий'
		};
		return priorityMap[priority] || priority;
	}

	getPriorityClass(priority: string): string {
		return `priority-${priority}`;
	}
}
