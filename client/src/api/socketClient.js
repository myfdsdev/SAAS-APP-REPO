// Socket.io client — real-time updates
// Connects once when user logs in, closes on logout.
// Entity subscribe() from apiClient hooks into these events.

import { io } from 'socket.io-client';
import { getToken } from './apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Strip /api from URL — Socket.io connects to root, not /api path
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;
const joinedGroups = new Set();

// Subscribers organized by entity name: { Message: [callback1, callback2], ... }
const entitySubscribers = {};

const stripZ = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  return dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr;
};

const normalizeSocketItem = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  return {
    ...item,
    id: item.id || item._id,
    created_date: item.created_date || stripZ(item.createdAt),
    updated_date: item.updated_date || stripZ(item.updatedAt),
  };
};

// Connect to Socket.io server
export const connectSocket = () => {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const token = getToken();
  if (!token) {
    console.warn('[Socket] No token, skipping connection');
    return null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
    joinedGroups.forEach((groupId) => {
      socket.emit('join_group', groupId);
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connect error:', err.message);
  });

  // === Direct messages ===
  socket.on('new_message', (data) => {
    notifyEntity('Message', { type: 'create', data });
  });
  socket.on('message_edited', (data) => {
    notifyEntity('Message', { type: 'update', data });
  });
  socket.on('message_deleted', (data) => {
    notifyEntity('Message', { type: 'update', data });
  });

  // === Group messages ===
  socket.on('new_group_message', (data) => {
    notifyEntity('GroupMessage', { type: 'create', data });
  });
  socket.on('group_message_edited', (data) => {
    notifyEntity('GroupMessage', { type: 'update', data });
  });
  socket.on('group_message_deleted', (data) => {
    notifyEntity('GroupMessage', { type: 'update', data });
  });

  // === Notifications ===
  socket.on('new_notification', (data) => {
    notifyEntity('Notification', { type: 'create', data });
  });

  // === Typing indicators (exposed for components that want them) ===
  socket.on('user_typing', (data) => {
    notifyEntity('_typing', { type: 'typing', data });
  });
  socket.on('user_stop_typing', (data) => {
    notifyEntity('_typing', { type: 'stop_typing', data });
  });

  // === User status changes ===
  socket.on('user_status_changed', (data) => {
    notifyEntity('User', { type: 'update', data });
  });

  return socket;
};

// Call subscribed callbacks for an entity
const notifyEntity = (entityName, event) => {
  const subs = entitySubscribers[entityName] || [];
  const normalizedEvent = {
    ...event,
    data: normalizeSocketItem(event.data),
  };
  subs.forEach((cb) => {
    try {
      cb(normalizedEvent);
    } catch (err) {
      console.error(`[Socket] Subscriber error (${entityName}):`, err);
    }
  });
};

// Register a subscriber for an entity's real-time events
// Returns an unsubscribe function
export const subscribeToEntity = (entityName, callback) => {
  if (!entitySubscribers[entityName]) {
    entitySubscribers[entityName] = [];
  }
  entitySubscribers[entityName].push(callback);

  // Make sure socket is connected
  connectSocket();

  // Return unsubscribe
  return () => {
    entitySubscribers[entityName] = entitySubscribers[entityName].filter(
      (cb) => cb !== callback
    );
  };
};

// Emit an event (for sending messages via socket)
export const emitSocket = (event, data) => {
  if (!socket?.connected) {
    connectSocket();
  }
  if (socket?.connected) {
    socket.emit(event, data);
  }
};

// Join a group room (for group chats)
export const joinGroup = (groupId) => {
  if (!groupId) return;
  joinedGroups.add(groupId);
  emitSocket('join_group', groupId);
};

export const leaveGroup = (groupId) => {
  if (!groupId) return;
  joinedGroups.delete(groupId);
  emitSocket('leave_group', groupId);
};

// Typing indicators
export const emitTyping = (receiverId) => {
  emitSocket('typing', { receiver_id: receiverId });
};

export const emitStopTyping = (receiverId) => {
  emitSocket('stop_typing', { receiver_id: receiverId });
};

// Disconnect (call on logout)
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  // Clear all subscribers
  Object.keys(entitySubscribers).forEach((key) => {
    entitySubscribers[key] = [];
  });
  joinedGroups.clear();
};

// Get raw socket instance (for advanced use)
export const getSocket = () => socket;
