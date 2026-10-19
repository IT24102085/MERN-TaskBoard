const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'due-today',
        'overdue',
        'system',
        'project-created',
        'project-updated',
        'project-deleted',
        'task-created',
        'task-updated',
        'task-completed',
        'task-deleted',
        'task-assigned'
      ],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    reminderKey: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true
    },
    dedupeKey: {
      type: String,
      default: undefined,
      unique: true,
      sparse: true
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, relatedTask: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
