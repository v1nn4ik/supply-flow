import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { UserService, User } from '../../services/user.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-create-task-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './create-task-modal.component.html',
  styleUrls: ['./create-task-modal.component.scss']
})
export class CreateTaskModalComponent implements OnInit {
  @Output() taskCreated = new EventEmitter<Task>();
  @Output() closeModal = new EventEmitter<void>();

  users: User[] = [];

  task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'> = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(),
    assignedTo: ''
  };

  validationError: string | null = null;

  constructor(
    private taskService: TaskService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (error) => {
        console.error('Ошибка при загрузке пользователей:', error);
      }
    });
  }

  validateTask(): boolean {
    if (!this.task.title || this.task.title.trim() === '') {
      this.validationError = 'Название задачи обязательно для заполнения';
      return false;
    }

    if (!this.task.dueDate) {
      this.validationError = 'Срок выполнения обязателен для заполнения';
      return false;
    }

    if (!this.task.assignedTo) {
      this.validationError = 'Необходимо выбрать исполнителя';
      return false;
    }

    this.validationError = null;
    return true;
  }

  prepareTaskData(): any {
    const description = this.task.description || '';
    return {
      ...this.task,
      title: this.task.title.trim(),
      description: description.trim(),
      assignedTo: this.task.assignedTo || null
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
        console.error('Ошибка при создании задания:', error);
        this.validationError = 'Ошибка при создании задачи. Пожалуйста, попробуйте снова.';
      }
    });
  }

  onClose(): void {
    this.closeModal.emit();
  }

  getUserFullName(user: User): string {
    return this.userService.getFullName(user);
  }
} 