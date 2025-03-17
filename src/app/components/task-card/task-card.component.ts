import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task } from '../../models/task.model';
import { TaskService } from '../../services/task.service';
import { UserService, User } from '../../services/user.service';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-card.component.html',
  styleUrls: ['./task-card.component.scss']
})
export class TaskCardComponent implements OnInit {
  @Input() task!: Task;
  @Output() taskDeleted = new EventEmitter<string>();
  @Output() taskUpdated = new EventEmitter<Task>();

  users: User[] = [];

  statuses: { value: TaskStatus; label: string }[] = [
    { value: 'pending', label: 'В ожидании' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'completed', label: 'Выполнено' },
    { value: 'cancelled', label: 'Отменено' }
  ];

  constructor(
    private taskService: TaskService,
    private userService: UserService
  ) {}

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
    if (this.task._id && confirm('Вы уверены, что хотите удалить эту задачу?')) {
      this.taskService.deleteTask(this.task._id).subscribe({
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
    if (this.task._id) {
      this.taskService.updateTask(this.task._id, { status: newStatus }).subscribe({
        next: (updatedTask) => {
          this.taskUpdated.emit(updatedTask);
        },
        error: (error) => {
          console.error('Error updating task status:', error);
        }
      });
    }
  }

  getUserFullName(userId: string): string {
    const user = this.users.find(u => u._id === userId);
    return user ? this.userService.getFullName(user) : 'Не назначено';
  }

  getPriorityLabel(priority: string): string {
    const priorities: { [key: string]: string } = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий'
    };
    return priorities[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'pending': 'В ожидании',
      'in_progress': 'В работе',
      'completed': 'Выполнено',
      'cancelled': 'Отменено'
    };
    return statusLabels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }
}
