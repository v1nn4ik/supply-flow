import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

export interface Comment {
  _id: string;
  supplyId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  getComments(supplyId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${API_URL}/comments/supply/${supplyId}`, this.getHeaders());
  }

  addComment(supplyId: string, text: string): Observable<Comment> {
    return this.http.post<Comment>(`${API_URL}/comments`, {
      supplyId,
      text
    }, this.getHeaders());
  }
} 