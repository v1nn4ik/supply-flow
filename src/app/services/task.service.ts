import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from '../models/task.model';
import { environment } from '../../environments/environment';

@Injectable({
	providedIn: 'root'
})
export class TaskService {
	private apiUrl = `${environment.apiUrl}/tasks`;

	constructor(private http: HttpClient) { }

	private getHeaders() {
		const token = localStorage.getItem('token');
		return {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		};
	}

	getTasks(): Observable<Task[]> {
		return this.http.get<Task[]>(this.apiUrl, this.getHeaders());
	}

	getTasksByUser(userId: string): Observable<Task[]> {
		return this.http.get<Task[]>(`${this.apiUrl}/user/${userId}`, this.getHeaders());
	}

	createTask(task: Partial<Task>): Observable<Task> {
		return this.http.post<Task>(this.apiUrl, task, this.getHeaders());
	}

	updateTask(taskId: string, task: Partial<Task>): Observable<Task> {
		return this.http.patch<Task>(`${this.apiUrl}/${taskId}`, task, this.getHeaders());
	}

	deleteTask(taskId: string): Observable<void> {
		return this.http.delete<void>(`${this.apiUrl}/${taskId}`, this.getHeaders());
	}
} 
