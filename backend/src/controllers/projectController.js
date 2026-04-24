const nodeCrypto = require('crypto');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { emitToProject, emitToUser, emitToUsers } = require('../socket');
const {
  ensureValidObjectId,
  getProjectMemberRecord,
  getProjectMemberRole,
} = require('../middleware/projectAccessMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const invitationExpiryDays = 7;

const projectPopulate = [
  { path: 'owner', select: '_id name email' },
  { path: 'members.user', select: '_id name email' },
  { path: 'invitations.invitedBy', select: '_id name email' },
];

const populateProject = (query) => query.populate(projectPopulate);

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const buildInviteToken = () => nodeCrypto.randomBytes(24).toString('hex');

const buildInvitationExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + invitationExpiryDays);
  return expiresAt;
};

const getInvitationId = (invitation) => invitation?._id?.toString() || null;
const buildActorId = (userId) => userId?.toString() || null;
const getProjectId = (project) => project?._id?.toString() || null;
const getProjectMemberUserIds = (project) =>
  (project?.members || [])
    .map((member) => member.user?._id?.toString?.() || member.user?.toString?.())
    .filter(Boolean);

const getInvitationById = (project, invitationId) =>
  (project?.invitations || []).find(
    (invitation) => getInvitationId(invitation) === invitationId?.toString()
  ) || null;

const serializeInvitation = (project, invitation) => ({
  _id: getInvitationId(invitation),
  email: invitation.email,
  role: invitation.role,
  status: invitation.status,
  createdAt: invitation.createdAt || null,
  expiresAt: invitation.expiresAt || null,
  invitedBy: invitation.invitedBy || null,
  project: {
    _id: project._id,
    name: project.name,
    color: project.color,
    status: project.status,
  },
});

const emitProjectUpdatedToMembers = (project, actorId) => {
  const payload = {
    projectId: getProjectId(project),
    actorId,
  };

  emitToProject(project._id, 'project:updated', payload);
  emitToUsers(getProjectMemberUserIds(project), 'project:updated', payload);
};

const ensureInvitationIsActionable = async (project, invitation, user) => {
  if (!invitation) {
    const error = new Error('Invitation not found.');
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status !== 'pending') {
    const error = new Error(`This invitation is already ${invitation.status}.`);
    error.statusCode = 400;
    throw error;
  }

  if (invitation.expiresAt <= new Date()) {
    invitation.status = 'expired';
    await project.save();
    const error = new Error('This invitation has expired.');
    error.statusCode = 410;
    throw error;
  }

  if (normalizeEmail(user.email) !== invitation.email) {
    const error = new Error('Your account email does not match this invitation.');
    error.statusCode = 403;
    throw error;
  }
};

const expireProjectInvitations = async (project) => {
  let hasChanges = false;
  const now = new Date();

  for (const invitation of project.invitations || []) {
    if (invitation.status === 'pending' && invitation.expiresAt <= now) {
      invitation.status = 'expired';
      hasChanges = true;
    }
  }

  if (hasChanges) {
    await project.save();
  }

  return project;
};

const serializeProject = (project, userId) => {
  const projectObject = project.toObject();
  const currentUserRole = getProjectMemberRole(project, userId);
  const canManageMembers = ['owner', 'admin'].includes(currentUserRole);

  return {
    ...projectObject,
    currentUserRole,
    canManageMembers,
    canDeleteProject: currentUserRole === 'owner',
    invitations: canManageMembers ? projectObject.invitations : [],
  };
};

const syncUserProjects = async (userIds, projectId) => {
  if (!userIds.length) {
    return;
  }

  await User.updateMany(
    {
      _id: { $in: userIds },
    },
    {
      $addToSet: {
        projects: projectId,
      },
    }
  );
};

const createProject = asyncHandler(async (req, res) => {
  const name = req.body.name?.trim();

  if (!name) {
    res.status(400);
    throw new Error('Project name is required.');
  }

  const project = await Project.create({
    name,
    description: req.body.description?.trim() || '',
    color: req.body.color?.trim() || undefined,
    owner: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'owner',
        joinedAt: new Date(),
      },
    ],
  });

  await syncUserProjects([req.user._id], project._id);

  const populatedProject = await populateProject(Project.findById(project._id));

  res.status(201).json(serializeProject(populatedProject, req.user._id));
});

const listProjects = asyncHandler(async (req, res) => {
  const projects = await populateProject(
    Project.find({
      'members.user': req.user._id,
    }).sort({
      status: 1,
      updatedAt: -1,
    })
  );

  const serializedProjects = [];

  for (const project of projects) {
    await expireProjectInvitations(project);
    serializedProjects.push(serializeProject(project, req.user._id));
  }

  const ownedProjects = serializedProjects.filter(
    (project) => project.owner?._id?.toString() === req.user._id.toString()
  );
  const contributedProjects = serializedProjects.filter(
    (project) => project.owner?._id?.toString() !== req.user._id.toString()
  );

  res.status(200).json({
    ownedProjects,
    contributedProjects,
  });
});

const getProjectById = asyncHandler(async (req, res) => {
  await expireProjectInvitations(req.project);
  await req.project.populate(projectPopulate);

  res.status(200).json(serializeProject(req.project, req.user._id));
});

const getProjectMembers = asyncHandler(async (req, res) => {
  await expireProjectInvitations(req.project);
  await req.project.populate(projectPopulate);

  const currentUserRole = getProjectMemberRole(req.project, req.user._id);
  const canManageMembers = ['owner', 'admin'].includes(currentUserRole);
  const projectObject = req.project.toObject();

  res.status(200).json({
    projectId: req.project._id,
    name: req.project.name,
    color: req.project.color,
    owner: projectObject.owner,
    currentUserRole,
    canManageMembers,
    members: projectObject.members,
    invitations: canManageMembers ? projectObject.invitations : [],
  });
});

const updateProject = asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) {
    const name = req.body.name?.trim();

    if (!name) {
      res.status(400);
      throw new Error('Project name is required.');
    }

    req.project.name = name;
  }

  if (req.body.description !== undefined) {
    req.project.description = req.body.description?.trim() || '';
  }

  if (req.body.color !== undefined) {
    req.project.color = req.body.color?.trim() || '#2563eb';
  }

  if (req.body.status !== undefined) {
    const allowedStatuses = ['active', 'archived'];

    if (!allowedStatuses.includes(req.body.status)) {
      res.status(400);
      throw new Error('Invalid project status value.');
    }

    req.project.status = req.body.status;
  }

  await req.project.save();
  await req.project.populate(projectPopulate);
  emitProjectUpdatedToMembers(req.project, buildActorId(req.user._id));

  res.status(200).json(serializeProject(req.project, req.user._id));
});

const deleteProject = asyncHandler(async (req, res) => {
  const projectId = getProjectId(req.project);
  const memberUserIds = getProjectMemberUserIds(req.project);

  await Promise.all([
    Task.deleteMany({
      project: req.project._id,
    }),
    User.updateMany(
      {
        _id: { $in: memberUserIds },
      },
      {
        $pull: {
          projects: req.project._id,
        },
      }
    ),
    req.project.deleteOne(),
  ]);

  const payload = {
    projectId,
    actorId: buildActorId(req.user._id),
  };

  emitToProject(projectId, 'project:deleted', payload);
  emitToUsers(memberUserIds, 'project:deleted', payload);

  res.status(200).json({
    message: 'Project deleted successfully.',
  });
});

const inviteProjectMember = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const role = req.body.role || 'member';
  const allowedRoles = ['admin', 'member'];

  if (!email) {
    res.status(400);
    throw new Error('Invitation email is required.');
  }

  if (!allowedRoles.includes(role)) {
    res.status(400);
    throw new Error('Invitation role must be admin or member.');
  }

  await expireProjectInvitations(req.project);

  const pendingInvitation = req.project.invitations.find(
    (invitation) => invitation.email === email && invitation.status === 'pending'
  );

  if (pendingInvitation) {
    res.status(409);
    throw new Error('A pending invitation already exists for this email.');
  }

  const existingUser = await User.findOne({ email }).select('_id name email');

  if (existingUser) {
    const isUserAlreadyMember = req.project.members.some(
      (member) => member.user?.toString() === existingUser._id.toString()
    );

    if (isUserAlreadyMember) {
      res.status(409);
      throw new Error('This user is already a member of the project.');
    }
  }

  const invitation = {
    email,
    role,
    token: buildInviteToken(),
    status: 'pending',
    invitedBy: req.user._id,
    expiresAt: buildInvitationExpiry(),
  };

  req.project.invitations.push(invitation);
  await req.project.save();
  await req.project.populate(projectPopulate);

  const createdInvitation = req.project.invitations.find(
    (item) => item.token === invitation.token
  );
  const invitationPayload = {
    projectId: getProjectId(req.project),
    invitation: serializeInvitation(req.project, createdInvitation),
    actorId: buildActorId(req.user._id),
  };

  emitToProject(req.project._id, 'member:invited', invitationPayload);

  if (existingUser?._id) {
    emitToUser(existingUser._id, 'member:invited', invitationPayload);
  }

  res.status(201).json({
    message: 'Invitation created successfully.',
    invitation: createdInvitation,
    inviteLink: `/api/projects/invitations/${invitation.token}/accept`,
    inviteCode: invitation.token,
    project: serializeProject(req.project, req.user._id),
  });
});

const acceptProjectInvitation = asyncHandler(async (req, res) => {
  const token = req.params.token?.trim();

  if (!token) {
    res.status(400);
    throw new Error('Invitation token is required.');
  }

  const project = await Project.findOne({
    'invitations.token': token,
  });

  if (!project) {
    res.status(404);
    throw new Error('Invitation not found.');
  }

  const invitation = project.invitations.find((item) => item.token === token);
  await ensureInvitationIsActionable(project, invitation, req.user);

  const existingMember = getProjectMemberRecord(project, req.user._id);
  const wasAdded = !existingMember;

  if (!existingMember) {
    project.members.push({
      user: req.user._id,
      role: invitation.role,
      joinedAt: new Date(),
    });
  }

  invitation.status = 'accepted';
  await project.save();

  await Promise.all([
    User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        projects: project._id,
      },
    }),
    project.populate(projectPopulate),
  ]);

  emitProjectUpdatedToMembers(project, buildActorId(req.user._id));

  if (wasAdded) {
    const memberPayload = {
      projectId: getProjectId(project),
      userId: req.user._id.toString(),
      role: invitation.role,
      actorId: buildActorId(req.user._id),
    };

    emitToProject(project._id, 'member:added', memberPayload);
    emitToUser(req.user._id, 'member:added', memberPayload);
  }

  res.status(200).json({
    message: 'Invitation accepted successfully.',
    project: serializeProject(project, req.user._id),
  });
});

const listMyProjectInvitations = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.user.email);
  const projects = await populateProject(
    Project.find({
      invitations: {
        $elemMatch: {
          email,
          status: 'pending',
        },
      },
    }).sort({
      updatedAt: -1,
    })
  );

  const invitations = [];

  for (const project of projects) {
    await expireProjectInvitations(project);

    for (const invitation of project.invitations || []) {
      if (invitation.email === email && invitation.status === 'pending') {
        invitations.push(serializeInvitation(project, invitation));
      }
    }
  }

  invitations.sort((left, right) => {
    const leftTime = new Date(left.createdAt || left.expiresAt || 0).getTime();
    const rightTime = new Date(right.createdAt || right.expiresAt || 0).getTime();
    return rightTime - leftTime;
  });

  res.status(200).json({
    invitations,
  });
});

const acceptMyProjectInvitation = asyncHandler(async (req, res) => {
  ensureValidObjectId(req.params.inviteId, 'invitation id');

  const project = await Project.findOne({
    'invitations._id': req.params.inviteId,
  });

  if (!project) {
    res.status(404);
    throw new Error('Invitation not found.');
  }

  const invitation = getInvitationById(project, req.params.inviteId);
  await ensureInvitationIsActionable(project, invitation, req.user);

  const existingMember = getProjectMemberRecord(project, req.user._id);
  const wasAdded = !existingMember;

  if (!existingMember) {
    project.members.push({
      user: req.user._id,
      role: invitation.role,
      joinedAt: new Date(),
    });
  }

  invitation.status = 'accepted';
  await project.save();

  await Promise.all([
    User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        projects: project._id,
      },
    }),
    project.populate(projectPopulate),
  ]);

  emitProjectUpdatedToMembers(project, buildActorId(req.user._id));

  if (wasAdded) {
    const memberPayload = {
      projectId: getProjectId(project),
      userId: req.user._id.toString(),
      role: invitation.role,
      actorId: buildActorId(req.user._id),
    };

    emitToProject(project._id, 'member:added', memberPayload);
    emitToUser(req.user._id, 'member:added', memberPayload);
  }

  res.status(200).json({
    message: 'Invitation accepted successfully.',
    invitation: serializeInvitation(project, invitation),
    project: serializeProject(project, req.user._id),
  });
});

const rejectMyProjectInvitation = asyncHandler(async (req, res) => {
  ensureValidObjectId(req.params.inviteId, 'invitation id');

  const project = await Project.findOne({
    'invitations._id': req.params.inviteId,
  });

  if (!project) {
    res.status(404);
    throw new Error('Invitation not found.');
  }

  const invitation = getInvitationById(project, req.params.inviteId);
  await ensureInvitationIsActionable(project, invitation, req.user);

  invitation.status = 'rejected';
  await project.save();
  await project.populate(projectPopulate);
  emitProjectUpdatedToMembers(project, buildActorId(req.user._id));

  res.status(200).json({
    message: 'Invitation rejected successfully.',
    invitation: serializeInvitation(project, invitation),
  });
});

const removeProjectMember = asyncHandler(async (req, res) => {
  ensureValidObjectId(req.params.userId, 'user id');

  const targetMember = getProjectMemberRecord(req.project, req.params.userId);

  if (!targetMember) {
    res.status(404);
    throw new Error('User is not a member of this project.');
  }

  if (targetMember.role === 'owner' || req.project.owner.toString() === req.params.userId) {
    res.status(400);
    throw new Error('Project owner cannot be removed from the project.');
  }

  req.project.members = req.project.members.filter(
    (member) => member.user?.toString() !== req.params.userId
  );

  await req.project.save();

  await Promise.all([
    User.findByIdAndUpdate(req.params.userId, {
      $pull: {
        projects: req.project._id,
      },
    }),
    Task.updateMany(
      {
        project: req.project._id,
        assignedTo: req.params.userId,
      },
      {
        $set: {
          assignedTo: null,
        },
      }
    ),
  ]);

  await req.project.populate(projectPopulate);
  const memberPayload = {
    projectId: getProjectId(req.project),
    userId: req.params.userId,
    actorId: buildActorId(req.user._id),
  };

  emitToProject(req.project._id, 'member:removed', memberPayload);
  emitToUser(req.params.userId, 'member:removed', memberPayload);
  emitProjectUpdatedToMembers(req.project, buildActorId(req.user._id));

  res.status(200).json(serializeProject(req.project, req.user._id));
});

const updateProjectMemberRole = asyncHandler(async (req, res) => {
  ensureValidObjectId(req.params.userId, 'user id');

  const targetMember = getProjectMemberRecord(req.project, req.params.userId);
  const currentUserRole = getProjectMemberRole(req.project, req.user._id);
  const nextRole = req.body.role;
  const allowedRoles = ['admin', 'member'];

  if (!targetMember) {
    res.status(404);
    throw new Error('User is not a member of this project.');
  }

  if (!allowedRoles.includes(nextRole)) {
    res.status(400);
    throw new Error('Member role must be admin or member.');
  }

  if (targetMember.role === 'owner' || req.project.owner.toString() === req.params.userId) {
    res.status(400);
    throw new Error('Project owner role cannot be changed.');
  }

  if (req.params.userId === req.user._id.toString()) {
    res.status(400);
    throw new Error('You cannot change your own project role.');
  }

  if (currentUserRole === 'admin' && targetMember.role !== 'member') {
    res.status(403);
    throw new Error('Admins can only update members with the member role.');
  }

  targetMember.role = nextRole;
  await req.project.save();
  await req.project.populate(projectPopulate);
  emitProjectUpdatedToMembers(req.project, buildActorId(req.user._id));

  res.status(200).json(serializeProject(req.project, req.user._id));
});

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  getProjectMembers,
  updateProject,
  deleteProject,
  inviteProjectMember,
  acceptProjectInvitation,
  listMyProjectInvitations,
  acceptMyProjectInvitation,
  rejectMyProjectInvitation,
  removeProjectMember,
  updateProjectMemberRole,
};
