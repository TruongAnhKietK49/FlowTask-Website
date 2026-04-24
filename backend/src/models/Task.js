const mongoose = require('mongoose');
const Project = require('./Project');

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      minlength: [1, 'Subtask title is required'],
      maxlength: [160, 'Subtask title must not exceed 160 characters'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
    id: false,
  }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title is required'],
      maxlength: [120, 'Title must not exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must not exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.from(
          new Set(
            (tags || [])
              .map((tag) => String(tag).trim().toLowerCase())
              .filter(Boolean)
          )
        ),
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    reminderSent: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

taskSchema.index({ project: 1, createdAt: -1 });
taskSchema.index({ project: 1, status: 1, priority: 1, dueDate: 1 });

taskSchema.virtual('subtasksCount').get(function getSubtasksCount() {
  return this.subtasks?.length || 0;
});

taskSchema.virtual('completedSubtasksCount').get(function getCompletedSubtasksCount() {
  return (this.subtasks || []).filter((subtask) => subtask.isCompleted).length;
});

taskSchema.virtual('completionPercentage').get(function getCompletionPercentage() {
  const total = this.subtasks?.length || 0;

  if (!total) {
    return this.status === 'completed' ? 100 : 0;
  }

  return Math.round((this.completedSubtasksCount / total) * 100);
});

taskSchema.pre('validate', function syncCreatorFields(next) {
  if (!this.createdBy && this.owner) {
    this.createdBy = this.owner;
  }

  if (!this.owner && this.createdBy) {
    this.owner = this.createdBy;
  }

  next();
});

taskSchema.pre('validate', async function validateAssignedMember(next) {
  if (!this.project || !this.assignedTo) {
    return next();
  }

  const project = await Project.findOne({
    _id: this.project,
    'members.user': this.assignedTo,
  }).select('_id');

  if (!project) {
    this.invalidate('assignedTo', 'Assigned user must be a member of the selected project.');
  }

  next();
});

taskSchema.pre('save', function syncCompletedAt(next) {
  const subtasks = this.subtasks || [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.isCompleted).length;

  if (this.isModified('dueDate')) {
    this.reminderSent = false;
  }

  if (subtasks.length > 0) {
    if (completedSubtasks === subtasks.length) {
      this.status = 'completed';
    } else if (this.status === 'completed') {
      this.status = completedSubtasks > 0 ? 'in_progress' : 'todo';
    }
  }

  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  if (this.status !== 'completed') {
    this.completedAt = null;
  }

  next();
});

module.exports = mongoose.model('Task', taskSchema);
