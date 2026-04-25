const cron = require('node-cron');
const Task = require('../models/Task');

// Helper to format Date as "YYYY-MM-DD"
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const startScheduler = () => {
  // Run every day at midnight (0 0 * * *)
  // For testing purposes, you could change this to '* * * * *' to run every minute
  cron.schedule('0 0 * * *', async () => {
    console.log('Running recurring tasks scheduler...');
    try {
      const todayStr = formatDate(new Date());
      
      const recurringTasks = await Task.find({ recurrence: { $ne: 'none' } });
      
      for (const task of recurringTasks) {
        let shouldGenerate = false;
        
        if (!task.lastRecurrenceGenerated) {
          shouldGenerate = true;
        } else {
          const lastDate = new Date(task.lastRecurrenceGenerated);
          const now = new Date();
          const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
          
          if (task.recurrence === 'daily' && diffDays >= 1) {
            shouldGenerate = true;
          } else if (task.recurrence === 'weekly' && diffDays >= 7) {
            shouldGenerate = true;
          } else if (task.recurrence === 'monthly' && diffDays >= 30) {
            shouldGenerate = true;
          }
        }
        
        if (shouldGenerate) {
          // Create new non-recurring task instance
          await Task.create({
            ownerId: task.ownerId,
            collaborators: task.collaborators,
            title: task.title,
            description: task.description,
            assignee: task.assignee,
            type: task.type,
            priority: task.priority,
            status: "Pending", // Reset status for the new instance
            deadline: task.type === "deadline" ? todayStr : null,
            parentTask: task.parentTask,
            dependencies: task.dependencies,
            recurrence: 'none', // The generated instance shouldn't recur itself
          });
          
          // Update the template task
          task.lastRecurrenceGenerated = todayStr;
          await task.save();
          console.log(`Generated recurring task instance for: ${task.title}`);
        }
      }
    } catch (err) {
      console.error('Error in scheduler:', err);
    }
  });
};

module.exports = { startScheduler };
