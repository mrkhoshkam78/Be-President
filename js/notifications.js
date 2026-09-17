// notifications.js - Notification Center (Bell) V3.3.0
// Replaces intrusive popups for crises / wars / major events

function ensureNotifications(state) {
  if (!state.notifications) {
    state.notifications = [];
    state.notificationsUnread = 0;
  }
  return state;
}

function pushNotification(state, item) {
  ensureNotifications(state);
  const n = {
    id: 'ntf_' + Date.now() + '_' + Math.floor(Math.random() * 999),
    title: item.title || 'اعلان',
    body: item.body || item.summary || '',
    line2: item.line2 || '',
    severity: item.severity || 'info', // info | success | warning | critical
    category: item.category || 'general',
    year: state.time?.year,
    month: state.time?.month,
    day: state.time?.totalDays || 0,
    read: false,
    ts: Date.now()
  };
  state.notifications.unshift(n);
  if (state.notifications.length > 80) state.notifications = state.notifications.slice(0, 80);
  state.notificationsUnread = (state.notificationsUnread || 0) + 1;
  // Also mirror important ones to news feed
  if (item.important !== false && typeof addNews === 'function' && (item.severity === 'critical' || item.severity === 'warning')) {
    addNews(state, {
      type: item.category === 'war' ? 'military' : (item.category || 'domestic'),
      category: item.category || 'general',
      icon: item.severity === 'critical' ? '🚨' : '⚠️',
      title: item.title,
      summary: item.body,
      line2: item.line2,
      important: item.severity === 'critical'
    });
  }
  return n;
}

function markNotificationRead(state, id) {
  ensureNotifications(state);
  const n = state.notifications.find(x => x.id === id);
  if (n && !n.read) {
    n.read = true;
    state.notificationsUnread = Math.max(0, (state.notificationsUnread || 1) - 1);
  }
}

function markAllNotificationsRead(state) {
  ensureNotifications(state);
  state.notifications.forEach(n => { n.read = true; });
  state.notificationsUnread = 0;
}

window.pushNotification = pushNotification;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.ensureNotifications = ensureNotifications;
