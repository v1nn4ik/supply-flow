const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
	text: {
		type: String,
		required: true,
		trim: true
	},
	author: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
});

const attachmentSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true
	},
	url: {
		type: String,
		required: true
	},
	type: {
		type: String,
		required: true
	},
	size: {
		type: Number,
		required: true
	},
	uploadedBy: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
});

const taskHistorySchema = new mongoose.Schema({
	field: {
		type: String,
		required: true
	},
	oldValue: mongoose.Schema.Types.Mixed,
	newValue: mongoose.Schema.Types.Mixed,
	changedBy: {
		type: String,
		required: true,
		trim: true
	}
}, {
	timestamps: true
});

const taskSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		trim: true
	},
	description: {
		type: String,
		trim: true
	},
	status: {
		type: String,
		enum: ['pending', 'in_progress', 'completed', 'cancelled'],
		default: 'pending'
	},
	priority: {
		type: String,
		enum: ['low', 'medium', 'high'],
		default: 'medium'
	},
	dueDate: {
		type: Date,
		required: true
	},
	assignedTo: {
		type: String,
		trim: true
	},
	tags: [{
		type: String,
		trim: true
	}],
	comments: [commentSchema],
	attachments: [attachmentSchema],
	history: [taskHistorySchema],
	estimatedTime: {
		type: Number,
		min: 0
	},
	actualTime: {
		type: Number,
		min: 0
	}
}, {
	timestamps: true
});

// Индексы для оптимизации поиска
taskSchema.index({ title: 'text', description: 'text' });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema); 