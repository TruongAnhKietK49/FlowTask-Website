const mongoose = require('mongoose');
const connectDb = require('../config/db');
require('../config/env');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

const getDefaultProjectName = (user) => `${user.name}'s Workspace`;

const ensureWorkspaceProject = async (user) => {
  const defaultName = getDefaultProjectName(user);

  let project = await Project.findOne({
    owner: user._id,
    name: defaultName,
  });

  if (!project) {
    project = await Project.create({
      name: defaultName,
      description: 'Auto-created during the personal-to-project migration.',
      owner: user._id,
      members: [
        {
          user: user._id,
          role: 'owner',
          joinedAt: new Date(),
        },
      ],
      status: 'active',
    });
  }

  await User.findByIdAndUpdate(user._id, {
    $addToSet: {
      projects: project._id,
    },
  });

  return project;
};

const runMigration = async () => {
  await connectDb();

  const users = await User.find().select('_id name email');
  const existingProjects = await Project.find();

  for (const project of existingProjects) {
    const normalizedMembers = (project.members || []).map((member) => {
      if (member?.user) {
        return member;
      }

      return {
        user: member,
        role: project.owner?.toString() === member?.toString() ? 'owner' : 'member',
        joinedAt: project.createdAt || new Date(),
      };
    });

    project.members = normalizedMembers;
    project.invitations = project.invitations || [];
    await project.save();
  }

  for (const user of users) {
    const workspaceProject = await ensureWorkspaceProject(user);

    await Task.updateMany(
      {
        owner: user._id,
        $or: [{ project: { $exists: false } }, { project: null }],
      },
      {
        $set: {
          project: workspaceProject._id,
          createdBy: user._id,
          owner: user._id,
          assignedTo: user._id,
        },
      }
    );
  }

  console.log(`Migration complete for ${users.length} user(s).`);
};

runMigration()
  .catch((error) => {
    console.error('Project migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
