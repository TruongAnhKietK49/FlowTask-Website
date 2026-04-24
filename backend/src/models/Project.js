const mongoose = require('mongoose');

const memberRoles = ['owner', 'admin', 'member'];
const invitationStatuses = ['pending', 'accepted', 'expired', 'revoked', 'rejected'];

const normalizeEmail = (value = '') => String(value).trim().toLowerCase();

const toObjectIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value.user) {
    return value.user.toString();
  }

  return value.toString();
};

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: memberRoles,
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const invitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: memberRoles.filter((role) => role !== 'owner'),
      default: 'member',
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: invitationStatuses,
      default: 'pending',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const normalizeMembers = (members = [], ownerId, fallbackDate = new Date()) => {
  const memberMap = new Map();

  for (const member of members || []) {
    const userId = toObjectIdString(member);

    if (!userId) {
      continue;
    }

    const memberValue =
      typeof member === 'object' && member.user
        ? {
            user: member.user,
            role: member.role || 'member',
            joinedAt: member.joinedAt || fallbackDate,
          }
        : {
            user: member,
            role: 'member',
            joinedAt: fallbackDate,
          };

    memberMap.set(userId, memberValue);
  }

  if (ownerId) {
    const ownerKey = ownerId.toString();
    const existingOwnerMember = memberMap.get(ownerKey);

    memberMap.set(ownerKey, {
      user: ownerId,
      role: 'owner',
      joinedAt: existingOwnerMember?.joinedAt || fallbackDate,
    });
  }

  return Array.from(memberMap.values()).map((member) => ({
    user: member.user,
    role:
      member.role === 'owner' && ownerId?.toString() !== member.user.toString()
        ? 'member'
        : member.role,
    joinedAt: member.joinedAt || fallbackDate,
  }));
};

const normalizeInvitations = (invitations = []) =>
  (invitations || []).map((invitation) => ({
    ...invitation,
    email: normalizeEmail(invitation.email),
    role:
      memberRoles.includes(invitation.role) && invitation.role !== 'owner'
        ? invitation.role
        : 'member',
  }));

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [1, 'Project name is required'],
      maxlength: [120, 'Project name must not exceed 120 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [600, 'Project description must not exceed 600 characters'],
    },
    color: {
      type: String,
      trim: true,
      default: '#2563eb',
      maxlength: [20, 'Project color must not exceed 20 characters'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner is required'],
      index: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    invitations: {
      type: [invitationSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.pre('validate', function ensureOwnerMembership(next) {
  this.members = normalizeMembers(this.members, this.owner, this.createdAt || new Date());
  this.invitations = normalizeInvitations(this.invitations);
  next();
});

projectSchema.methods.getMember = function getMember(userId) {
  const normalizedUserId = userId?.toString();

  return (this.members || []).find(
    (member) => member.user?.toString() === normalizedUserId
  );
};

projectSchema.methods.getMemberRole = function getMemberRole(userId) {
  return this.getMember(userId)?.role || null;
};

projectSchema.index({ 'members.user': 1, updatedAt: -1 });
projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ 'invitations.email': 1 });
projectSchema.index({ 'invitations.token': 1 });

module.exports = mongoose.model('Project', projectSchema);
