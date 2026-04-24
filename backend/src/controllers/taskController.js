const Project = require('../models/Project');
const Task = require('../models/Task');
const { emitToProject } = require('../socket');
const {
  canManageTask,
  ensureValidObjectId,
  getProjectMemberRole,
  requireProjectMemberAccess,
} = require('../middleware/projectAccessMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const allowedSortFields = new Set(['createdAt', 'updatedAt', 'title', 'status', 'priority', 'dueDate']);
const taskPopulate = [
  { path: 'assignedTo', select: '_id name email' },
  { path: 'createdBy', select: '_id name email' },
  { path: 'project', select: '_id name color status' },
];
const buildActorId = (userId) => userId?.toString() || null;

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

const ensureValidSubtaskId = (subtaskId) => {
  ensureValidObjectId(subtaskId, 'subtask id');
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

const ensureTaskManagementAccess = (req, task, project) => {
  if (!canManageTask(req.user, task, project)) {
    const error = new Error('You do not have permission to modify this task.');
    error.statusCode = 403;
    throw error;
  }
};

const canAssignTask = (req, task, project) => {
  const currentRole = getProjectMemberRole(project, req.user._id);

  return (
    currentRole === 'owner' ||
    currentRole === 'admin' ||
    task.createdBy?.toString() === req.user._id.toString()
  );
};

const resolveAssignedTo = async (assignedTo, project) => {
  if (assignedTo === undefined) {
    return undefined;
  }

  if (assignedTo === null || assignedTo === '') {
    return null;
  }

  ensureValidObjectId(assignedTo, 'assigned user id');

  const isProjectMember = project.members.some(
    (member) => member.user?.toString() === assignedTo.toString()
  );

  if (!isProjectMember) {
    const error = new Error('Assigned user must be a member of the selected project.');
    error.statusCode = 400;
    throw error;
  }

  return assignedTo;
};

const populateTaskDocument = async (task) => task.populate(taskPopulate);

const findTaskByIdForMember = async (taskId, userId) => {
  ensureValidObjectId(taskId, 'task id');

  const task = await Task.findById(taskId);

  if (!task) {
    return null;
  }

  const project = await requireProjectMemberAccess(task.project, userId);

  return {
    task,
    project,
  };
};

const listTasks = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;
  const {
    project: projectId,
    search,
    status,
    priority,
    assignedTo,
    sortBy,
    sortOrder,
  } = req.query;
  let projectIds = [];
  let selectedProject = null;

  if (projectId) {
    selectedProject = await requireProjectMemberAccess(projectId, req.user._id);
    projectIds = [selectedProject._id];
  } else {
    const memberProjects = await Project.find({
      'members.user': req.user._id,
    }).select('_id');

    projectIds = memberProjects.map((project) => project._id);
  }

  if (!projectIds.length) {
    return res.status(200).json({
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  }

  const query = {
    project: projectIds.length === 1 ? projectIds[0] : { $in: projectIds },
  };

  if (status) {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (assignedTo === 'unassigned') {
    query.assignedTo = null;
  } else if (assignedTo) {
    ensureValidObjectId(assignedTo, 'assigned user id');

    if (selectedProject) {
      const isProjectMember = selectedProject.members.some(
        (member) => member.user?.toString() === assignedTo.toString()
      );

      if (!isProjectMember) {
        res.status(400);
        throw new Error('Assigned user must be a member of the selected project.');
      }
    }

    query.assignedTo = assignedTo;
  }

  const normalizedSearch = search?.trim();

  if (normalizedSearch) {
    const regex = new RegExp(normalizedSearch, 'i');
    query.$or = [{ title: regex }, { description: regex }, { tags: regex }, { 'subtasks.title': regex }];
  }

  const [tasks, total] = await Promise.all([
    Task.find(query)
      .populate(taskPopulate)
      .sort(parseSort(sortBy, sortOrder))
      .skip(skip)
      .limit(limit),
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
  const result = await findTaskByIdForMember(req.params.id, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  await populateTaskDocument(result.task);
  res.status(200).json(result.task);
});

const createTask = asyncHandler(async (req, res) => {
  if (!req.body.title?.trim()) {
    res.status(400);
    throw new Error('Title is required.');
  }

  if (!req.body.project) {
    res.status(400);
    throw new Error('Project id is required.');
  }

  const project = await requireProjectMemberAccess(req.body.project, req.user._id);
  const assignedTo = await resolveAssignedTo(req.body.assignedTo, project);

  const task = await Task.create({
    ...buildTaskPayload(req.body),
    project: project._id,
    createdBy: req.user._id,
    assignedTo: assignedTo ?? null,
    owner: req.user._id,
  });

  await populateTaskDocument(task);
  emitToProject(project._id, 'task:created', {
    projectId: project._id.toString(),
    task,
    actorId: buildActorId(req.user._id),
  });

  res.status(201).json(task);
});

const updateTask = asyncHandler(async (req, res) => {
  const result = await findTaskByIdForMember(req.params.id, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  const { task, project } = result;
  ensureTaskManagementAccess(req, task, project);

  if (
    req.body.project !== undefined &&
    req.body.project.toString() !== task.project.toString()
  ) {
    res.status(400);
    throw new Error('Changing a task project is not supported in this endpoint.');
  }

  let assignedTo = task.assignedTo;

  if (req.body.assignedTo !== undefined) {
    if (!canAssignTask(req, task, project)) {
      res.status(403);
      throw new Error('You do not have permission to reassign this task.');
    }

    assignedTo = await resolveAssignedTo(req.body.assignedTo, project);
  }

  Object.assign(task, buildTaskPayload({ ...task.toObject(), ...req.body }), {
    assignedTo,
  });

  await task.save();
  await populateTaskDocument(task);
  emitToProject(project._id, 'task:updated', {
    projectId: project._id.toString(),
    task,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json(task);
});

const deleteTask = asyncHandler(async (req, res) => {
  const result = await findTaskByIdForMember(req.params.id, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  ensureTaskManagementAccess(req, result.task, result.project);

  const projectId = result.task.project.toString();
  const taskId = result.task._id.toString();
  await result.task.deleteOne();
  emitToProject(projectId, 'task:deleted', {
    projectId,
    taskId,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json({
    message: 'Task deleted successfully.',
  });
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['todo', 'in_progress', 'completed'];

  if (!allowedStatuses.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value.');
  }

  const result = await findTaskByIdForMember(req.params.id, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  ensureTaskManagementAccess(req, result.task, result.project);

  result.task.status = status;
  await result.task.save();
  await populateTaskDocument(result.task);
  emitToProject(result.project._id, 'task:statusChanged', {
    projectId: result.project._id.toString(),
    task: result.task,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json(result.task);
});

const assignTask = asyncHandler(async (req, res) => {
  const result = await findTaskByIdForMember(req.params.taskId, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  if (!canAssignTask(req, result.task, result.project)) {
    res.status(403);
    throw new Error('You do not have permission to assign this task.');
  }

  result.task.assignedTo = await resolveAssignedTo(req.body.assignedTo, result.project);
  await result.task.save();
  await populateTaskDocument(result.task);
  emitToProject(result.project._id, 'task:assigned', {
    projectId: result.project._id.toString(),
    task: result.task,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json(result.task);
});

const createSubtask = asyncHandler(async (req, res) => {
  const result = await findTaskByIdForMember(req.params.id, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  ensureTaskManagementAccess(req, result.task, result.project);

  const title = req.body.title?.trim();

  if (!title) {
    res.status(400);
    throw new Error('Subtask title is required.');
  }

  result.task.subtasks.push({ title });
  await result.task.save();
  await populateTaskDocument(result.task);
  emitToProject(result.project._id, 'subtask:created', {
    projectId: result.project._id.toString(),
    task: result.task,
    actorId: buildActorId(req.user._id),
  });

  res.status(201).json(result.task);
});

const updateSubtask = asyncHandler(async (req, res) => {
  ensureValidSubtaskId(req.params.subtaskId);

  const result = await findTaskByIdForMember(req.params.taskId, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  ensureTaskManagementAccess(req, result.task, result.project);

  const subtask = result.task.subtasks.id(req.params.subtaskId);

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

  await result.task.save();
  await populateTaskDocument(result.task);
  emitToProject(result.project._id, 'subtask:updated', {
    projectId: result.project._id.toString(),
    task: result.task,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json(result.task);
});

const deleteSubtask = asyncHandler(async (req, res) => {
  ensureValidSubtaskId(req.params.subtaskId);

  const result = await findTaskByIdForMember(req.params.taskId, req.user._id);

  if (!result) {
    res.status(404);
    throw new Error('Task not found.');
  }

  ensureTaskManagementAccess(req, result.task, result.project);

  const subtask = result.task.subtasks.id(req.params.subtaskId);

  if (!subtask) {
    res.status(404);
    throw new Error('Subtask not found.');
  }

  subtask.deleteOne();
  await result.task.save();
  await populateTaskDocument(result.task);
  emitToProject(result.project._id, 'subtask:deleted', {
    projectId: result.project._id.toString(),
    task: result.task,
    subtaskId: req.params.subtaskId,
    actorId: buildActorId(req.user._id),
  });

  res.status(200).json(result.task);
});

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  assignTask,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
