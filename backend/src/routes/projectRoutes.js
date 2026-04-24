const express = require('express');
const {
  acceptProjectInvitation,
  createProject,
  deleteProject,
  getProjectById,
  getProjectMembers,
  inviteProjectMember,
  listProjects,
  removeProjectMember,
  updateProjectMemberRole,
  updateProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const {
  requireProjectAdminOrOwner,
  requireProjectMember,
  requireProjectOwner,
} = require('../middleware/projectAccessMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(listProjects).post(createProject);
router.post('/invitations/:token/accept', acceptProjectInvitation);
router
  .route('/:projectId')
  .get(requireProjectMember('projectId'), getProjectById)
  .patch(requireProjectAdminOrOwner('projectId'), updateProject)
  .delete(requireProjectOwner('projectId'), deleteProject);

router.get('/:projectId/members', requireProjectMember('projectId'), getProjectMembers);
router.post('/:projectId/invitations', requireProjectAdminOrOwner('projectId'), inviteProjectMember);
router.delete(
  '/:projectId/members/:userId',
  requireProjectAdminOrOwner('projectId'),
  removeProjectMember
);
router.patch(
  '/:projectId/members/:userId',
  requireProjectAdminOrOwner('projectId'),
  updateProjectMemberRole
);

module.exports = router;
