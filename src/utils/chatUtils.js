// src/chatUtils.js

// Contact pair ID (alfabetisch gesorteerd)
export const getContactPairId = (user1, user2) => {
  const sorted = [user1, user2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

// Chat room ID
export const getChatRoomId = (user1, user2) => {
  return `CHAT_${getContactPairId(user1, user2)}`;
};

// Avatar URL generator
export const getAvatarUrl = (username) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
};