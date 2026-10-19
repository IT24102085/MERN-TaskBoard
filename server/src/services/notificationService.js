const Notification = require('../models/Notification.js');

async function createNotificationSafely({
  recipient,
  type,
  title,
  message,
  relatedTask = null,
  dedupeKey = null
}) {
  try {
    const notificationData = {
      recipient,
      type,
      title,
      message,
      relatedTask
    };

    if (dedupeKey) {
      notificationData.dedupeKey = dedupeKey;
    }

    return await Notification.create(notificationData);
  } catch (error) {
    if (error?.code === 11000) {
      return null;
    }

    // Notification delivery must not turn a successful primary mutation into
    // a failed API response.
    console.error('Notification creation failed:', error.message);
    return null;
  }
}

module.exports = { createNotificationSafely };
