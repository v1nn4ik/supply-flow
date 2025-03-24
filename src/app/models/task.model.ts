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
	tags?: string[];
	comments?: Comment[];
	attachments?: Attachment[];
	history?: TaskHistory[];
	estimatedTime?: number; // в часах
	actualTime?: number; // в часах
}

export interface Comment {
	_id?: string;
	text: string;
	author: string;
	createdAt: Date;
	updatedAt?: Date;
}

export interface Attachment {
	_id?: string;
	name: string;
	url: string;
	type: string;
	size: number;
	uploadedBy: string;
	uploadedAt: Date;
}

export interface TaskHistory {
	_id?: string;
	timestamp: Date;
	user: string;
	field: string;
	oldValue: any;
	newValue: any;
	changedBy: string;
	changedAt: Date;
} 