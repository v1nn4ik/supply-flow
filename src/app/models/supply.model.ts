export interface SupplyItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface SupplyRequest {
  id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  deadline: Date;
  status: 'new' | 'in-progress' | 'completed' | 'cancelled';
  items: SupplyItem[];
  createdAt?: Date;
  updatedAt?: Date;
} 