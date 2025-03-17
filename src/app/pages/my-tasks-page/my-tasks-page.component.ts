import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTaskModalComponent } from '../../components/create-task-modal/create-task-modal.component';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { Task } from '../../models/task.model';
import { UserService } from '../../services/user.service';
import { TaskService } from '../../services/task.service';

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
export class MyTasksPageComponent implements OnInit {
  showCreateTaskModal = false;
  tasks: Task[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private taskService: TaskService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = null;

    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        if (user) {
          this.taskService.getTasksByUser(user._id).subscribe({
            next: (tasks: Task[]) => {
              this.tasks = tasks;
              this.loading = false;
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

  onCloseModal(): void {
    this.showCreateTaskModal = false;
  }

  onTaskCreated(task: Task): void {
    this.tasks.unshift(task);
    this.showCreateTaskModal = false;
  }

  onTaskDeleted(taskId: string): void {
    this.tasks = this.tasks.filter(task => task._id !== taskId);
  }

  onTaskUpdated(updatedTask: Task): void {
    const index = this.tasks.findIndex(task => task._id === updatedTask._id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
    }
  }
} 