export const getTaskDueState = (task) => {
  if (!task?.dueDate || task.status === 'completed') {
    return {
      kind: 'none',
      label: '',
      isOverdue: false,
      isDueSoon: false,
    };
  }

  const now = new Date();
  const dueDate = new Date(task.dueDate);

  if (Number.isNaN(dueDate.getTime())) {
    return {
      kind: 'none',
      label: '',
      isOverdue: false,
      isDueSoon: false,
    };
  }

  if (dueDate < now) {
    return {
      kind: 'overdue',
      label: 'Overdue',
      isOverdue: true,
      isDueSoon: false,
    };
  }

  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

  if (dueDate <= nextHour) {
    return {
      kind: 'due-soon',
      label: 'Due soon',
      isOverdue: false,
      isDueSoon: true,
    };
  }

  return {
    kind: 'none',
    label: '',
    isOverdue: false,
    isDueSoon: false,
  };
};
