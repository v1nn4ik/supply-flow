export interface Task {
  _id?: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  dueDate: Date;
  assignedTo?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 