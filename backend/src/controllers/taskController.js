const mongoose = require('mongoose');
const Task = require('../models/Task');
const asyncHandler = require('../utils/asyncHandler');

const allowedSortFields = new Set(['createdAt', 'updatedAt', 'title', 'status', 'priority', 'dueDate']);

const parseSort = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const field = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
  const direction = sortOrder === 'asc' ? 1 : -1;
  return { [field]: direction };
};

const normalizeTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  return String(tags)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const findTaskByIdForOwner = async (taskId, ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    const error = new Error('Invalid task id.');
    error.statusCode = 400;
    throw error;
  }

  return Task.findOne({
    _id: taskId,
    owner: ownerId,
  });
};

const ensureValidSubtaskId = (subtaskId) => {
  if (!mongoose.Types.ObjectId.isValid(subtaskId)) {
    const error = new Error('Invalid subtask id.');
    error.statusCode = 400;
    throw error;
  }
};

const buildTaskPayload = (input) => {
  const payload = {
    title: input.title?.trim(),
    description: input.description?.trim() || '',
    status: input.status,
    priority: input.priority,
    dueDate: input.dueDate || null,
    tags: normalizeTags(input.tags),
  };

  if (payload.status === 'completed') {
    payload.completedAt = new Date();
  }

  if (payload.status && payload.status !== 'completed') {
    payload.completedAt = null;
  }

  return payload;
};

const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;
  const { search, status, priority, sortBy, sortOrder } = req.query;

  const query = {
    owner: req.user._id,
  };

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ title: regex }, { description: regex }, { tags: regex }, { 'subtasks.title': regex }];
  }

  const [tasks, total] = await Promise.all([
    Task.find(query).sort(parseSort(sortBy, sortOrder)).skip(skip).limit(limit),
    Task.countDocuments(query),
  ]);

  res.status(200).json({
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: skip + tasks.length < total,
      hasPrevPage: page > 1,
    },
  });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await findTaskByIdForOwner(req.params.id, req.user._id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  res.status(200).json(task);
});

const createTask = asyncHandler(async (req, res) => {
  if (!req.body.title?.trim()) {
    res.status(400);
    throw new Error('Title is required.');
  }

  const task = await Task.create({
    ...buildTaskPayload(req.body),
    owner: req.user._id,
  });

  res.status(201).json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await findTaskByIdForOwner(req.params.id, req.user._id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  Object.assign(task, buildTaskPayload({ ...task.toObject(), ...req.body }));
  await task.save();

  res.status(200).json(task);
});

const deleteTask = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid task id.');
  }

  const task = await Task.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  res.status(200).json({
    message: 'Task deleted successfully.',
  });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Invalid task id.');
  }

  const { status } = req.body;
  const allowedStatuses = ['todo', 'in_progress', 'completed'];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value.');
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: req.user._id,
    },
    {
      status,
      completedAt: status === 'completed' ? new Date() : null,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  res.status(200).json(task);
});

const createSubtask = asyncHandler(async (req, res) => {
  const task = await findTaskByIdForOwner(req.params.id, req.user._id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  const title = req.body.title?.trim();

  if (!title) {
    res.status(400);
    throw new Error('Subtask title is required.');
  }

  task.subtasks.push({ title });
  await task.save();

  res.status(201).json(task);
});

const updateSubtask = asyncHandler(async (req, res) => {
  ensureValidSubtaskId(req.params.subtaskId);

  const task = await findTaskByIdForOwner(req.params.taskId, req.user._id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  const subtask = task.subtasks.id(req.params.subtaskId);

  if (!subtask) {
    res.status(404);
    throw new Error('Subtask not found.');
  }

  if (req.body.title !== undefined) {
    const title = req.body.title?.trim();

    if (!title) {
      res.status(400);
      throw new Error('Subtask title is required.');
    }

    subtask.title = title;
  }

  if (req.body.isCompleted !== undefined) {
    subtask.isCompleted = Boolean(req.body.isCompleted);
  }

  await task.save();

  res.status(200).json(task);
});

const deleteSubtask = asyncHandler(async (req, res) => {
  ensureValidSubtaskId(req.params.subtaskId);

  const task = await findTaskByIdForOwner(req.params.taskId, req.user._id);

  if (!task) {
    res.status(404);
    throw new Error('Task not found.');
  }

  const subtask = task.subtasks.id(req.params.subtaskId);

  if (!subtask) {
    res.status(404);
    throw new Error('Subtask not found.');
  }

  subtask.deleteOne();
  await task.save();

  res.status(200).json(task);
});

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
