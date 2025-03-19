import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTaskModalComponent } from '../../components/create-task-modal/create-task-modal.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { WebsocketService } from '../../services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tasks-page',
  imports: [
    CommonModule,
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
  loading = false;
  error: string | null = null;
  
  private taskUpdateSubscription?: Subscription;
  private newTaskSubscription?: Subscription;
  private taskDeleteSubscription?: Subscription;

  constructor(
    private taskService: TaskService,
    private websocketService: WebsocketService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
    this.setupWebSocket();
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
        this.tasks = this.tasks.map(task =>
          task._id === updatedTask._id ? updatedTask : task
        );
      },
      error: (error) => {
        console.error('Ошибка при получении обновлений задач:', error);
      }
    });

    // Подписка на новые задачи
    this.newTaskSubscription = this.websocketService.onNewTask().subscribe({
      next: (newTask) => {
        this.tasks = [newTask, ...this.tasks];
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
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.error = 'Ошибка при загрузке задач';
        this.loading = false;
      }
    });
  }

  onTaskCreated(task: Task): void {
    this.tasks = [task, ...this.tasks];
    this.showCreateTaskModal = false;
  }

  onTaskDeleted(taskId: string): void {
    this.tasks = this.tasks.filter(task => task._id !== taskId);
  }

  onTaskUpdated(updatedTask: Task): void {
    this.tasks = this.tasks.map(task => 
      task._id === updatedTask._id ? updatedTask : task
    );
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
