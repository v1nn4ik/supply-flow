import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Comment } from './comment.service';
import { SupplyRequest } from './supply.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;

  constructor() {
    // Используем базовый URL без /api
    const baseUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(baseUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      path: '/socket.io'
    });

    this.socket.on('connect_error', (error) => {
      console.error('Ошибка WebSocket соединения:', error);
    });
  }

  // Подключение к комнате заявки
  joinSupply(supplyId: string): void {
    if (this.socket.connected) {
      this.socket.emit('join-supply', supplyId);
    } else {
      this.socket.connect();
      this.socket.once('connect', () => {
        this.socket.emit('join-supply', supplyId);
      });
    }
  }

  // Отключение от комнаты заявки
  leaveSupply(supplyId: string): void {
    if (this.socket.connected) {
      this.socket.emit('leave-supply', supplyId);
    }
  }

  // Подписка на новые комментарии
  onNewComment(): Observable<Comment> {
    return new Observable(observer => {
      this.socket.on('new-comment', (comment: Comment) => {
        observer.next(comment);
      });

      return () => {
        this.socket.off('new-comment');
      };
    });
  }

  // Подписка на обновления списка заявок
  onSupplyUpdate(): Observable<SupplyRequest> {
    return new Observable(observer => {
      this.socket.on('supply-update', (supply: SupplyRequest) => {
        observer.next(supply);
      });

      return () => {
        this.socket.off('supply-update');
      };
    });
  }

  // Подписка на обновления деталей конкретной заявки
  onSupplyDetailsUpdate(): Observable<SupplyRequest> {
    return new Observable(observer => {
      this.socket.on('supply-details-update', (supply: SupplyRequest) => {
        observer.next(supply);
      });

      return () => {
        this.socket.off('supply-details-update');
      };
    });
  }

  // Подписка на обновления списка задач
  onTaskUpdate(): Observable<Task> {
    return new Observable(observer => {
      this.socket.on('task-update', (task: Task) => {
        observer.next(task);
      });

      return () => {
        this.socket.off('task-update');
      };
    });
  }

  // Подписка на создание новой задачи
  onNewTask(): Observable<Task> {
    return new Observable(observer => {
      this.socket.on('new-task', (task: Task) => {
        observer.next(task);
      });

      return () => {
        this.socket.off('new-task');
      };
    });
  }

  // Подписка на удаление задачи
  onTaskDelete(): Observable<string> {
    return new Observable(observer => {
      this.socket.on('task-delete', (taskId: string) => {
        observer.next(taskId);
      });

      return () => {
        this.socket.off('task-delete');
      };
    });
  }
} 