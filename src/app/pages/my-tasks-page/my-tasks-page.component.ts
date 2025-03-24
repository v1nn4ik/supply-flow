import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { Task } from '../../models/task.model';
import { UserService } from '../../services/user.service';
import { TaskService } from '../../services/task.service';
import { WebsocketService } from '../../services/websocket.service';
import { ModalService, ModalType } from '../../services/modal.service';
import { CreateMyTaskModalComponent } from '../../components/create-my-task-modal/create-my-task-modal.component';
import { Subscription } from 'rxjs';

@Component({
	selector: 'app-my-tasks-page',
	imports: [
		CommonModule,
		FormsModule,
		TaskCardComponent,
		CreateMyTaskModalComponent
	],
	templateUrl: './my-tasks-page.component.html',
	standalone: true,
	styleUrl: './my-tasks-page.component.scss'
})
export class MyTasksPageComponent implements OnInit, OnDestroy {
	showCreateTaskModal = false;
	tasks: Task[] = [];
	filteredTasks: Task[] = [];
	loading = false;
	error: string | null = null;
	private currentUserId: string | null = null;

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
		private userService: UserService,
		private websocketService: WebsocketService,
		private modalService: ModalService
	) { }

	ngOnInit(): void {
		this.loadTasks();
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

	private subscribeToModalEvents(): void {
		this.modalSubscription = this.modalService.modalOpen$.subscribe(modalType => {
			if (modalType === ModalType.CREATE_TASK) {
				this.openCreateTaskModal();
			}
		});
	}

	private setupWebSocket(): void {
		// Подписка на обновления задач
		this.taskUpdateSubscription = this.websocketService.onTaskUpdate().subscribe({
			next: (updatedTask) => {
				if (updatedTask.assignedTo === this.currentUserId) {
					this.tasks = this.tasks.map(task =>
						task._id === updatedTask._id ? updatedTask : task
					);
				} else {
					// Если задача больше не назначена текущему пользователю, удаляем её из списка
					this.tasks = this.tasks.filter(task => task._id !== updatedTask._id);
				}
				this.applyFilters();
			},
			error: (error) => {
				console.error('Ошибка при получении обновлений задач:', error);
			}
		});

		// Подписка на новые задачи
		this.newTaskSubscription = this.websocketService.onNewTask().subscribe({
			next: (newTask) => {
				if (newTask.assignedTo === this.currentUserId) {
					this.tasks = [newTask, ...this.tasks];
					this.applyFilters();
				}
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

	loadTasks(): void {
		this.loading = true;
		this.error = null;

		this.userService.getCurrentUser().subscribe({
			next: (user) => {
				if (user) {
					this.currentUserId = user._id;
					this.taskService.getTasksByUser(user._id).subscribe({
						next: (tasks: Task[]) => {
							this.tasks = tasks;
							this.applyFilters();
							this.loading = false;
							// Устанавливаем WebSocket подписки после получения ID пользователя
							this.setupWebSocket();
						},
						error: (error: any) => {
							console.error('Error loading tasks:', error);
							this.error = 'Ошибка при загрузке задач';
							this.loading = false;
						}
					});
				} else {
					this.error = 'Пользователь не авторизован';
					this.loading = false;
				}
			},
			error: (error: any) => {
				console.error('Error getting current user:', error);
				this.error = 'Ошибка при получении данных пользователя';
				this.loading = false;
			}
		});
	}

	openCreateTaskModal(): void {
		this.showCreateTaskModal = true;
	}

	onTaskCreated(task: Task): void {
		if (task.assignedTo === this.currentUserId) {
			this.tasks.unshift(task);
			this.applyFilters();
		}
		this.showCreateTaskModal = false;
	}

	onTaskDeleted(taskId: string): void {
		this.tasks = this.tasks.filter(task => task._id !== taskId);
		this.applyFilters();
	}

	onTaskUpdated(updatedTask: Task): void {
		if (updatedTask.assignedTo === this.currentUserId) {
			this.tasks = this.tasks.map(task =>
				task._id === updatedTask._id ? updatedTask : task
			);
		} else {
			// Если задача больше не назначена текущему пользователю, удаляем её из списка
			this.tasks = this.tasks.filter(task => task._id !== updatedTask._id);
		}
		this.applyFilters();
	}

	onCloseModal(): void {
		this.showCreateTaskModal = false;
	}
} 