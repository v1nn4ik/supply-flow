import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTaskModalComponent } from '../../components/create-task-modal/create-task-modal.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { Task } from '../../models/task.model';
import { UserService } from '../../services/user.service';
import { TaskService } from '../../services/task.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-my-tasks-page',
  imports: [
    CommonModule,
    CreateTaskModalComponent,
    TaskCardComponent
  ],
  templateUrl: './my-tasks-page.component.html',
  standalone: true,
  styleUrl: './my-tasks-page.component.scss'
})
export class MyTasksPageComponent implements OnInit, OnDestroy {
  showCreateTaskModal = false;
  tasks: Task[] = [];
  loading = false;
  error: string | null = null;
  private currentUserId: string | null = null;
  
  private taskUpdateSubscription?: Subscription;
  private newTaskSubscription?: Subscription;
  private taskDeleteSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private userService: UserService,
    private websocketService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
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
    }
    this.showCreateTaskModal = false;
  }

  onTaskDeleted(taskId: string): void {
    this.tasks = this.tasks.filter(task => task._id !== taskId);
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
  }

  onCloseModal(): void {
    this.showCreateTaskModal = false;
  }
} 