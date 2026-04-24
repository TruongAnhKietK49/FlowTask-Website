const mongoose = require('mongoose');
const Project = require('../models/Project');
const asyncHandler = require('../utils/asyncHandler');

const ensureValidObjectId = (value, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Invalid ${label}.`);
    error.statusCode = 400;
    throw error;
  }
};

const getObjectIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const getProjectById = async (projectId) => {
  ensureValidObjectId(projectId, 'project id');
  return Project.findById(projectId);
};

const getProjectMemberRecord = (project, userId) =>
  project?.members?.find(
    (member) => getObjectIdString(member.user) === getObjectIdString(userId)
  ) || null;

const getProjectMemberRole = (project, userId) => getProjectMemberRecord(project, userId)?.role || null;

const getProjectForMember = async (projectId, userId) => {
  ensureValidObjectId(projectId, 'project id');

  return Project.findOne({
    _id: projectId,
    'members.user': userId,
  });
};

const requireProjectMemberAccess = async (projectId, userId) => {
  const project = await getProjectForMember(projectId, userId);

  if (!project) {
    const error = new Error('Project not found or access denied.');
    error.statusCode = 404;
    throw error;
  }

  return project;
};

const requireProjectOwnerAccess = async (projectId, userId) => {
  const project = await getProjectById(projectId);

  if (!project) {
    const error = new Error('Project not found.');
    error.statusCode = 404;
    throw error;
  }

  if (!project.owner.equals(userId)) {
    const error = new Error('Only the project owner can perform this action.');
    error.statusCode = 403;
    throw error;
  }

  return project;
};

const requireProjectAdminOrOwnerAccess = async (projectId, userId) => {
  const project = await requireProjectMemberAccess(projectId, userId);
  const role = getProjectMemberRole(project, userId);

  if (!['owner', 'admin'].includes(role)) {
    const error = new Error('Only project owners or admins can perform this action.');
    error.statusCode = 403;
    throw error;
  }

  return project;
};

const canManageTask = (user, task, project) => {
  const userId = getObjectIdString(user?._id || user);
  const role = getProjectMemberRole(project, userId);

  if (!role) {
    return false;
  }

  if (role === 'owner' || role === 'admin') {
    return true;
  }

  return [task?.createdBy, task?.assignedTo, task?.owner].some(
    (value) => getObjectIdString(value) === userId
  );
};

const requireProjectMember = (paramKey = 'projectId') =>
  asyncHandler(async (req, _res, next) => {
    req.project = await requireProjectMemberAccess(req.params[paramKey], req.user._id);
    next();
  });

const requireProjectOwner = (paramKey = 'projectId') =>
  asyncHandler(async (req, _res, next) => {
    req.project = await requireProjectOwnerAccess(req.params[paramKey], req.user._id);
    next();
  });

const requireProjectAdminOrOwner = (paramKey = 'projectId') =>
  asyncHandler(async (req, _res, next) => {
    req.project = await requireProjectAdminOrOwnerAccess(req.params[paramKey], req.user._id);
    next();
  });

module.exports = {
  ensureValidObjectId,
  getProjectById,
  getProjectForMember,
  getProjectMemberRecord,
  getProjectMemberRole,
  requireProjectMemberAccess,
  requireProjectOwnerAccess,
  requireProjectAdminOrOwnerAccess,
  requireProjectMember,
  requireProjectOwner,
  requireProjectAdminOrOwner,
  canManageTask,
};
