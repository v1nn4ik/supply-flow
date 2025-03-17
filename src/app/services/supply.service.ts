import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;
const SUPPLY_ENDPOINT = '/supply';

export type SupplyStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export interface SupplyItem {
  name: string;
  quantity: number;
  unit: 'шт' | 'кг' | 'л' | 'м' | 'уп';
  purchased?: boolean;
}

export interface SupplyRequest {
  id?: string;
  _id?: string;
  title: string;
  description: string;
  items: SupplyItem[];
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  status?: SupplyStatus;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupplyService {
  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  createSupplyRequest(data: Omit<SupplyRequest, 'id'>): Observable<SupplyRequest> {
    return this.http.post<SupplyRequest>(`${API_URL}${SUPPLY_ENDPOINT}`, data, this.getHeaders());
  }

  getSupplyRequests(): Observable<SupplyRequest[]> {
    return this.http.get<SupplyRequest[]>(`${API_URL}${SUPPLY_ENDPOINT}`, this.getHeaders());
  }

  updateSupplyRequest(id: string, data: Partial<SupplyRequest>): Observable<SupplyRequest> {
    return this.http.patch<SupplyRequest>(`${API_URL}${SUPPLY_ENDPOINT}/${id}`, data, this.getHeaders());
  }

  updateSupplyStatus(id: string, status: SupplyStatus): Observable<SupplyRequest> {
    return this.http.patch<SupplyRequest>(
      `${API_URL}${SUPPLY_ENDPOINT}/${id}/status`,
      { status },
      this.getHeaders()
    );
  }

  deleteSupplyRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}${SUPPLY_ENDPOINT}/${id}`, this.getHeaders());
  }
}
