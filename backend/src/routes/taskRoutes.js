const express = require('express');
const {
  assignTask,
  createSubtask,
  createTask,
  deleteSubtask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
  updateSubtask,
  updateTaskStatus,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(listTasks).post(createTask);
router.post('/:id/subtasks', createSubtask);
router.patch('/:taskId/subtasks/:subtaskId', updateSubtask);
router.delete('/:taskId/subtasks/:subtaskId', deleteSubtask);
router.patch('/:taskId/assign', assignTask);
router.patch('/:id/status', updateTaskStatus);
router.route('/:id').get(getTaskById).put(updateTask).patch(updateTask).delete(deleteTask);

module.exports = router;
