const express = require('express');
const {
  acceptMyProjectInvitation,
  listMyProjectInvitations,
  rejectMyProjectInvitation,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', listMyProjectInvitations);
router.post('/:inviteId/accept', acceptMyProjectInvitation);
router.post('/:inviteId/reject', rejectMyProjectInvitation);

module.exports = router;
