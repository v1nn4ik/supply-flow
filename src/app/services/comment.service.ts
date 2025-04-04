import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

export interface CommentAttachment {
  name: string;
  originalName?: string;
  url: string;
  type?: string;
  size?: number;
}

export interface Comment {
  _id: string;
  supplyId: string;
  userId: string;
  userName: string;
  text: string;
  attachment?: CommentAttachment;
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

  addCommentWithAttachment(supplyId: string, file: File, text: string = ''): Observable<Comment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplyId', supplyId);
    
    if (text.trim()) {
      formData.append('text', text);
    }

    return this.http.post<Comment>(`${API_URL}/comments/attachment`, formData, this.getHeaders());
  }
} 