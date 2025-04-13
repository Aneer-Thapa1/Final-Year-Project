const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIO } = require('../config/socketConfig');
const fs = require('fs');

/** Create a new chat room (DM or Group)
 * @route POST /api/chat/rooms
 */
const createChatRoom = async (req, res) => {
    try {
        const { name, type, description, participants, is_private = false } = req.body;
        const userId = parseInt(req.user);

        console.log(name);



        // Create the room first
        const chatRoom = await prisma.chatRoom.create({
            data: {
                name: type === 'GROUP' ? name : null,
                description: type === 'GROUP' ? description : null,
                type,
                is_private: type === 'GROUP' ? is_private : false,
                created_by_id: type === 'GROUP' ? userId : null,
                participants: {
                    create: [
                        {
                            user_id: userId,
                            isAdmin: type === 'GROUP' // Creator is admin for group chats
                        },
                        ...participants.map(participantId => ({
                            user_id: parseInt(participantId)
                        }))
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                }
            }
        });

        // For group chats, create a system message about creation
        if (type === 'GROUP') {
            await prisma.message.create({
                data: {
                    room_id: chatRoom.room_id,
                    sender_id: userId,
                    content: `${req.user.user_name} created this group`,
                    message_type: 'SYSTEM'
                }
            });
        }

        // Notify all participants about the new chat room via socket
        const io = getIO();
        participants.forEach(participantId => {
            io.to(`user:${participantId}`).emit('chatRoom:created', chatRoom);
        });
        // Also notify the creator
        io.to(`user:${userId}`).emit('chatRoom:created', chatRoom);

        res.status(201).json({
            success: true,
            data: chatRoom
        });
    } catch (error) {
        console.error('Error creating chat room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chat room',
            error: error.message
        });
    }
};

/**
 * Create a direct message chat room or return existing one
 * @route POST /api/chat/direct
 */
const createDirectChat = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const userId = parseInt(req.user);

        // Check if DM already exists between these users
        const existingRoom = await prisma.chatRoom.findFirst({
            where: {
                type: 'DM',
                participants: {
                    every: {
                        user_id: {
                            in: [userId, parseInt(recipientId)]
                        }
                    },
                    // Make sure it's only these two users
                    none: {
                        user_id: {
                            notIn: [userId, parseInt(recipientId)]
                        }
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        if (existingRoom) {
            return res.status(200).json({
                success: true,
                data: {
                    ...existingRoom,
                    lastMessage: existingRoom.messages[0] || null,
                    messages: undefined // Remove messages array since we've extracted lastMessage
                },
                isNew: false
            });
        }

        // Check if recipientId exists
        const recipient = await prisma.user.findUnique({
            where: { user_id: parseInt(recipientId) },
            select: { user_id: true, user_name: true }
        });

        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Create new DM room
        const chatRoom = await prisma.chatRoom.create({
            data: {
                type: 'DM',
                participants: {
                    create: [
                        { user_id: userId },
                        { user_id: parseInt(recipientId) }
                    ]
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                }
            }
        });

        // Notify both users about the new chat room
        const io = getIO();
        io.to(`user:${recipientId}`).emit('chatRoom:created', chatRoom);
        io.to(`user:${userId}`).emit('chatRoom:created', chatRoom);

        res.status(201).json({
            success: true,
            data: chatRoom,
            isNew: true
        });
    } catch (error) {
        console.error('Error creating direct chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create direct chat',
            error: error.message
        });
    }
};

/**
 * Get all chat rooms for a user
 * @route GET /api/chat/rooms
 */
const getUserChatRooms = async (req, res) => {
    try {
        const userId = req.user;

        const chatRooms = await prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: {
                        user_id: parseInt(userId)
                    }
                }
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                },
                messages: {
                    take: 20, // Fetch more messages to properly analyze read status
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        },
                        readReceipts: {
                            where: {
                                user_id: parseInt(userId)
                            },
                            select: {
                                read_at: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        // Enhance chat rooms with read/unread information
        const enhancedChatRooms = await Promise.all(chatRooms.map(async (room) => {
            const participant = room.participants.find(p => p.user_id === parseInt(userId));
            const lastReadTimestamp = participant?.lastRead || new Date(0);

            // Get the most recent message
            const lastMessage = room.messages[0] || null;

            // Calculate read status
            let unreadCount = 0;
            let isLastMessageRead = false;

            if (lastMessage) {
                // If current user is the sender, message is considered read
                if (lastMessage.sender_id === userId) {
                    isLastMessageRead = true;
                } else {
                    // For direct messages, check lastRead timestamp
                    if (room.type === 'DM') {
                        isLastMessageRead = lastReadTimestamp >= new Date(lastMessage.createdAt);
                    } else {
                        // For group messages, check read receipts
                        isLastMessageRead = lastMessage.readReceipts.length > 0;
                    }
                }

                // Count unread messages
                if (room.type === 'DM') {
                    // For DMs, count messages after lastRead time
                    unreadCount = await prisma.message.count({
                        where: {
                            room_id: room.room_id,
                            createdAt: {
                                gt: lastReadTimestamp
                            },
                            sender_id: {
                                not: parseInt(userId) // Exclude messages sent by current user
                            }
                        }
                    });
                } else {
                    // For group chats, count messages without read receipts from this user
                    unreadCount = await prisma.message.count({
                        where: {
                            room_id: room.room_id,
                            sender_id: {
                                not: parseInt(userId) // Exclude messages sent by current user
                            },
                            readReceipts: {
                                none: {
                                    user_id: parseInt(userId)
                                }
                            }
                        }
                    });
                }
            }

            // For DM rooms, get the other participant's name for display
            let displayName = room.name;
            let otherParticipant = null;

            if (room.type === 'DM') {
                otherParticipant = room.participants.find(p => p.user_id !== userId)?.user;
                if (otherParticipant) {
                    displayName = otherParticipant.user_name;
                }
            }

            return {
                ...room,
                displayName,
                lastMessage: lastMessage,
                unreadCount,
                isLastMessageRead,
                lastReadAt: lastReadTimestamp,
                otherParticipant: otherParticipant,
                messages: undefined // Remove messages array since we've extracted lastMessage
            };
        }));

        res.json({
            success: true,
            data: enhancedChatRooms
        });

    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat rooms',
            error: error.message
        });
    }
};

/**
 * Get messages for a specific chat room
 * @route GET /api/chat/rooms/:roomId/messages
 */
const getChatMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { cursor, limit = 50 } = req.query;
        const userId = parseInt(req.user);

        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this chat room'
            });
        }

        const messages = await prisma.message.findMany({
            where: {
                room_id: parseInt(roomId),
                ...(cursor ? {
                    createdAt: {
                        lt: new Date(cursor)
                    }
                } : {})
            },
            take: parseInt(limit),
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                readReceipts: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                },
                reply_to: {
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true
                            }
                        }
                    }
                }
            }
        });

        // Update last read timestamp
        await prisma.chatParticipant.update({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            },
            data: {
                lastRead: new Date()
            }
        });

        // For group chats, create read receipts for all messages
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type === 'GROUP') {
            // Create read receipts in bulk for all messages without existing receipts from this user
            // First get messages without receipts from this user
            const messagesWithoutReceipts = await prisma.message.findMany({
                where: {
                    room_id: parseInt(roomId),
                    sender_id: { not: userId }, // Skip own messages
                    readReceipts: {
                        none: {
                            user_id: userId
                        }
                    }
                },
                select: { message_id: true }
            });

            if (messagesWithoutReceipts.length > 0) {
                // Create read receipts for these messages
                await prisma.readReceipt.createMany({
                    data: messagesWithoutReceipts.map(msg => ({
                        message_id: msg.message_id,
                        user_id: userId
                    })),
                    skipDuplicates: true
                });
            }
        }

        // Notify others that this user has read messages
        const io = getIO();
        io.to(`room:${roomId}`).emit('messages:read', {
            user_id: userId,
            room_id: parseInt(roomId),
            timestamp: new Date()
        });

        res.json({
            success: true,
            data: messages, // Reverse to get chronological order
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
            error: error.message
        });
    }
};

/**
 * Update chat participants (add or remove)
 * @route PATCH /api/chat/rooms/:roomId/participants
 */
const updateChatParticipants = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { addParticipants = [], removeParticipants = [] } = req.body;
        const userId = req.user.user_id;

        const userParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!userParticipant?.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can modify participants'
            });
        }

        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: true
            }
        });

        // Don't allow modifications to DM rooms
        if (room.type === 'DM') {
            return res.status(400).json({
                success: false,
                message: 'Cannot modify participants in direct message rooms'
            });
        }

        // Add new participants
        if (addParticipants.length > 0) {
            await prisma.chatParticipant.createMany({
                data: addParticipants.map(participantId => ({
                    user_id: parseInt(participantId),
                    room_id: parseInt(roomId)
                })),
                skipDuplicates: true
            });
        }

        // Remove participants, but prevent removing the last admin
        if (removeParticipants.length > 0) {
            // Check if trying to remove the last admin
            const admins = await prisma.chatParticipant.findMany({
                where: {
                    room_id: parseInt(roomId),
                    isAdmin: true
                }
            });

            const adminIds = admins.map(admin => admin.user_id);
            const removingAllAdmins = removeParticipants.length > 0 &&
                adminIds.every(adminId => removeParticipants.includes(adminId.toString()));

            if (removingAllAdmins) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove all admins from the group'
                });
            }

            await prisma.chatParticipant.deleteMany({
                where: {
                    room_id: parseInt(roomId),
                    user_id: {
                        in: removeParticipants.map(id => parseInt(id))
                    }
                }
            });
        }

        const updatedRoom = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Create system message about participant changes
        let systemMessage = '';
        if (addParticipants.length > 0) {
            const addedUsers = await prisma.user.findMany({
                where: { user_id: { in: addParticipants.map(id => parseInt(id)) } },
                select: { user_name: true }
            });
            const addedNames = addedUsers.map(u => u.user_name).join(', ');
            systemMessage += `${addedNames} ${addParticipants.length > 1 ? 'were' : 'was'} added to the group. `;
        }

        if (removeParticipants.length > 0) {
            const removedUsers = await prisma.user.findMany({
                where: { user_id: { in: removeParticipants.map(id => parseInt(id)) } },
                select: { user_name: true }
            });
            const removedNames = removedUsers.map(u => u.user_name).join(', ');
            systemMessage += `${removedNames} ${removeParticipants.length > 1 ? 'were' : 'was'} removed from the group.`;
        }

        if (systemMessage) {
            await prisma.message.create({
                data: {
                    room_id: parseInt(roomId),
                    sender_id: userId,
                    content: systemMessage,
                    message_type: 'SYSTEM'
                }
            });
        }

        // Notify all participants about changes
        const io = getIO();
        io.to(`room:${roomId}`).emit('participants:updated', updatedRoom);

        // Subscribe new participants to the room
        addParticipants.forEach(newUserId => {
            io.to(`user:${newUserId}`).emit('chatRoom:joined', updatedRoom);
        });

        // Notify removed participants
        removeParticipants.forEach(removedUserId => {
            io.to(`user:${removedUserId}`).emit('chatRoom:removed', { roomId: parseInt(roomId) });
        });

        res.json({
            success: true,
            data: updatedRoom
        });
    } catch (error) {
        console.error('Error updating participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update participants',
            error: error.message
        });
    }
};

/**
 * Delete a message
 * @route DELETE /api/chat/messages/:messageId
 */
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.user_id;

        const message = await prisma.message.findUnique({
            where: { message_id: parseInt(messageId) },
            include: { readReceipts: true }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Check if user is sender or admin of the room
        const isAdmin = await prisma.chatParticipant.findFirst({
            where: {
                room_id: message.room_id,
                user_id: userId,
                isAdmin: true
            }
        });

        if (message.sender_id !== userId && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this message'
            });
        }

        // Delete read receipts first
        if (message.readReceipts.length > 0) {
            await prisma.readReceipt.deleteMany({
                where: { message_id: parseInt(messageId) }
            });
        }

        // Then delete the message
        await prisma.message.delete({
            where: { message_id: parseInt(messageId) }
        });

        // Notify room about the deleted message
        const io = getIO();
        io.to(`room:${message.room_id}`).emit('message:deleted', {
            messageId: parseInt(messageId),
            roomId: message.room_id
        });

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            error: error.message
        });
    }
};

/**
 * Mark messages as read
 * @route POST /api/chat/rooms/:roomId/read
 */
const markMessagesAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;

        const userId = parseInt(req.user)

        const currentTime = new Date();

        // Update participant's last read timestamp
        await prisma.chatParticipant.update({
            where: {
                user_id_room_id: {
                    user_id: parseInt(userId),
                    room_id: parseInt(roomId)
                }
            },
            data: {
                lastRead: currentTime
            }
        });



        // For group chats, create read receipts for unread messages
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type === 'GROUP') {
            // Get all unread messages
            const unreadMessages = await prisma.message.findMany({
                where: {
                    room_id: parseInt(roomId),
                    sender_id: { not: userId }, // Skip own messages
                    readReceipts: {
                        none: {
                            user_id: userId
                        }
                    }
                },
                select: { message_id: true }
            });

            if (unreadMessages.length > 0) {
                // Create read receipts
                await prisma.readReceipt.createMany({
                    data: unreadMessages.map(msg => ({
                        message_id: msg.message_id,
                        user_id: userId
                    })),
                    skipDuplicates: true
                });
            }
        }

        // Get unread count to help UI update
        const unreadCount = await prisma.message.count({
            where: {
                room_id: parseInt(roomId),
                createdAt: {
                    gt: currentTime
                },
                sender_id: {
                    not: userId
                }
            }
        });

        // Notify room members about read status
        const io = getIO();
        io.to(`room:${roomId}`).emit('messages:read', {
            user_id: userId,
            room_id: parseInt(roomId),
            timestamp: currentTime
        });

        res.json({
            success: true,
            message: 'Messages marked as read',
            data: {
                unreadCount,
                user_id: userId,
                room_id: parseInt(roomId),
                timestamp: currentTime
            }
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read',
            error: error.message
        });
    }
};

/**
 * Send a message to a chat room
 * @route POST /api/chat/rooms/:roomId/messages
 */
const sendMessage = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { content, message_type = 'TEXT', reply_to_id, media_url, media_type, media_size, media_width, media_height, media_duration } = req.body;
        const userId = parseInt(req.user);
        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message content cannot be empty'
            });
        }

        // Check if user is participant of the room
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages in this chat room'
            });
        }

        // Get room type and participants
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    select: { user_id: true }
                }
            }
        });

        // Create the message
        const message = await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content,
                message_type,
                reply_to_id: reply_to_id ? parseInt(reply_to_id) : null,
                // Media fields for rich messages
                media_url,
                media_type,
                media_size: media_size ? parseInt(media_size) : null,
                media_width: media_width ? parseInt(media_width) : null,
                media_height: media_height ? parseInt(media_height) : null,
                media_duration: media_duration ? parseInt(media_duration) : null
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                reply_to: {
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true
                            }
                        }
                    }
                }
            }
        });

        // For direct messages, mark as delivered immediately
        if (room.type === 'DM') {
            await prisma.message.update({
                where: { message_id: message.message_id },
                data: { delivered_at: new Date() }
            });
        }

        // Update room's last activity
        await prisma.chatRoom.update({
            where: { room_id: parseInt(roomId) },
            data: { updatedAt: new Date() }
        });

        // Emit message to all room participants via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('message:received', message);

        // Clear typing status for the sender
        io.to(`room:${roomId}`).emit('user:stopTyping', {
            roomId: parseInt(roomId),
            userId
        });

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

/**
 * Indicate user is typing in a chat room
 * @route POST /api/chat/rooms/:roomId/typing
 */
const updateTypingStatus = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { isTyping } = req.body;
        const userId = req.user;

        // Check if user is participant of the room
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: parseInt(userId),
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update typing status in this chat room'
            });
        }

        // Get user info for the notification
        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(userId) },
            select: { user_name: true }
        });

        // Emit typing status to all room participants via socket
        const io = getIO();
        if (isTyping) {
            io.to(`room:${roomId}`).emit('user:typing', {
                roomId: parseInt(roomId),
                userId,
                userName: user.user_name
            });
        } else {
            io.to(`room:${roomId}`).emit('user:stopTyping', {
                roomId: parseInt(roomId),
                userId
            });
        }

        res.status(200).json({
            success: true,
            message: `Typing status updated to ${isTyping ? 'typing' : 'not typing'}`
        });
    } catch (error) {
        console.error('Error updating typing status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update typing status',
            error: error.message
        });
    }
};

/**
 * Edit a message
 * @route PUT /api/chat/messages/:messageId
 */
const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.user_id;

        // Find the message
        const message = await prisma.message.findUnique({
            where: { message_id: parseInt(messageId) }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Only the sender can edit their message
        if (message.sender_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Can only edit your own messages'
            });
        }

        // Don't allow editing of certain message types
        if (message.message_type === 'SYSTEM') {
            return res.status(400).json({
                success: false,
                message: 'System messages cannot be edited'
            });
        }

        // Update the message
        const updatedMessage = await prisma.message.update({
            where: { message_id: parseInt(messageId) },
            data: {
                content,
                updatedAt: new Date() // This will mark it as edited
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                reply_to: {
                    include: {
                        sender: {
                            select: {
                                user_id: true,
                                user_name: true
                            }
                        }
                    }
                },
                readReceipts: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Notify room about the edited message
        const io = getIO();
        io.to(`room:${message.room_id}`).emit('message:edited', updatedMessage);

        res.json({
            success: true,
            data: updatedMessage
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to edit message',
            error: error.message
        });
    }
};

/**
 * Leave a chat room
 * @route POST /api/chat/rooms/:roomId/leave
 */
const leaveChat = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.user_id;

        // Get room details
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: true
            }
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Chat room not found'
            });
        }

        // Check if user is part of the room
        const userParticipant = room.participants.find(p => p.user_id === userId);
        if (!userParticipant) {
            return res.status(400).json({
                success: false,
                message: 'You are not a participant of this chat room'
            });
        }

        // Cannot leave a DM
        if (room.type === 'DM') {
            return res.status(400).json({
                success: false,
                message: 'Cannot leave a direct message chat'
            });
        }

        // Check if this is the last admin leaving a group
        if (userParticipant.isAdmin) {
            const adminCount = room.participants.filter(p => p.isAdmin).length;
            if (adminCount === 1 && room.participants.length > 1) {
                // Assign another participant as admin
                const nextAdmin = room.participants.find(p => p.user_id !== userId);
                if (nextAdmin) {
                    await prisma.chatParticipant.update({
                        where: {
                            user_id_room_id: {
                                user_id: nextAdmin.user_id,
                                room_id: parseInt(roomId)
                            }
                        },
                        data: { isAdmin: true }
                    });

                    // Create system message about admin change
                    const newAdmin = await prisma.user.findUnique({
                        where: { user_id: nextAdmin.user_id },
                        select: { user_name: true }
                    });

                    await prisma.message.create({
                        data: {
                            room_id: parseInt(roomId),
                            sender_id: userId,
                            content: `${newAdmin.user_name} is now an admin of this group`,
                            message_type: 'SYSTEM'
                        }
                    });
                }
            }
        }

        // Create a system message about the user leaving
        await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content: `${req.user.user_name} left the group`,
                message_type: 'SYSTEM'
            }
        });

        // Remove the user from the chat room
        await prisma.chatParticipant.delete({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        // If this was the last participant, delete the room
        const remainingParticipants = await prisma.chatParticipant.count({
            where: { room_id: parseInt(roomId) }
        });

        if (remainingParticipants === 0) {
            // Delete all messages and the room
            await prisma.message.deleteMany({
                where: { room_id: parseInt(roomId) }
            });

            await prisma.chatRoom.delete({
                where: { room_id: parseInt(roomId) }
            });
        }

        // Notify other participants about the user leaving
        const io = getIO();
        io.to(`room:${roomId}`).emit('participant:left', {
            roomId: parseInt(roomId),
            userId: userId,
            userName: req.user.user_name
        });

        // Remove user from the socket room
        const socket = io.sockets.sockets.get(req.query.socketId);
        if (socket) {
            socket.leave(`room:${roomId}`);
        }

        res.json({
            success: true,
            message: 'Successfully left the chat room'
        });
    } catch (error) {
        console.error('Error leaving chat room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave chat room',
            error: error.message
        });
    }
};

/**
 * Upload media to a chat
 * @route POST /api/chat/rooms/:roomId/media
 */
const uploadMedia = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.user_id;
        const file = req.file; // From multer middleware

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        // Check if user is participant of the room
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            // Clean up uploaded file
            fs.unlinkSync(file.path);

            return res.status(403).json({
                success: false,
                message: 'Not authorized to send media in this chat room'
            });
        }

        // Determine media type based on mimetype
        let messageType = 'FILE';
        if (file.mimetype.startsWith('image/')) {
            messageType = 'IMAGE';
        } else if (file.mimetype.startsWith('video/')) {
            messageType = 'VIDEO';
        } else if (file.mimetype.startsWith('audio/')) {
            messageType = 'AUDIO';
        }

        // Create the message with the media
        const message = await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content: file.originalname, // Use filename as content
                message_type: messageType,
                media_url: `/uploads/${file.filename}`,
                media_type: file.mimetype,
                media_size: file.size
                // Note: For images and videos, you might want to add dimensions
                // For audio/video, you might want to add duration
                // These would require additional processing
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            }
        });

        // Update room's last activity
        await prisma.chatRoom.update({
            where: { room_id: parseInt(roomId) },
            data: { updatedAt: new Date() }
        });

        // Emit message to all room participants via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('message:received', message);

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        // Clean up uploaded file if there was an error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }

        console.error('Error uploading media:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload media',
            error: error.message
        });
    }
};

/**
 * Update chat room details (name, description, avatar)
 * @route PATCH /api/chat/rooms/:roomId
 */
const updateChatRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { name, description, avatar } = req.body;
        const userId = req.user.user_id;

        // Check if user is admin of the room
        const userParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!userParticipant?.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can update room details'
            });
        }

        // Get room type
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type === 'DM') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update direct message room details'
            });
        }

        // Update the room
        const updatedRoom = await prisma.chatRoom.update({
            where: { room_id: parseInt(roomId) },
            data: {
                name: name,
                description: description,
                avatar: avatar
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Create system message about the update
        let changes = [];
        if (name) changes.push('name');
        if (description) changes.push('description');
        if (avatar) changes.push('avatar');

        if (changes.length > 0) {
            const changeStr = changes.join(', ');
            await prisma.message.create({
                data: {
                    room_id: parseInt(roomId),
                    sender_id: userId,
                    content: `${req.user.user_name} updated the group ${changeStr}`,
                    message_type: 'SYSTEM'
                }
            });
        }

        // Notify all participants about the room update
        const io = getIO();
        io.to(`room:${roomId}`).emit('chatRoom:updated', updatedRoom);

        res.json({
            success: true,
            data: updatedRoom
        });
    } catch (error) {
        console.error('Error updating chat room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update chat room',
            error: error.message
        });
    }
};

/**
 * Update participant admin status
 * @route PATCH /api/chat/rooms/:roomId/participants/:participantId
 */
const updateParticipantRole = async (req, res) => {
    try {
        const { roomId, participantId } = req.params;
        const { isAdmin } = req.body;
        const userId = req.user.user_id;

        // Check if user is admin of the room
        const userParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!userParticipant?.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can update participant roles'
            });
        }

        // Get room type
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type === 'DM') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update roles in direct message rooms'
            });
        }

        // Update participant role
        await prisma.chatParticipant.update({
            where: {
                user_id_room_id: {
                    user_id: parseInt(participantId),
                    room_id: parseInt(roomId)
                }
            },
            data: { isAdmin: isAdmin }
        });

        // Get participant name for system message
        const participant = await prisma.user.findUnique({
            where: { user_id: parseInt(participantId) },
            select: { user_name: true }
        });

        // Create system message about the role change
        const actionText = isAdmin ? 'promoted to admin' : 'removed as admin';
        await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content: `${participant.user_name} was ${actionText} by ${req.user.user_name}`,
                message_type: 'SYSTEM'
            }
        });

        // Get updated room data
        const updatedRoom = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Notify all participants about the role change
        const io = getIO();
        io.to(`room:${roomId}`).emit('participant:roleChanged', {
            roomId: parseInt(roomId),
            participantId: parseInt(participantId),
            isAdmin: isAdmin,
            room: updatedRoom
        });

        res.json({
            success: true,
            data: {
                roomId: parseInt(roomId),
                participantId: parseInt(participantId),
                isAdmin: isAdmin
            }
        });
    } catch (error) {
        console.error('Error updating participant role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update participant role',
            error: error.message
        });
    }
};

/**
 * Setup user socket rooms (called when user connects)
 * @route GET /api/chat/socket/setup
 */
const setupUserSocket = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const socketId = req.query.socketId;

        if (!socketId) {
            return res.status(400).json({
                success: false,
                message: 'Socket ID is required'
            });
        }

        // Get all rooms where user is a participant
        const userRooms = await prisma.chatParticipant.findMany({
            where: { user_id: userId },
            select: { room_id: true }
        });

        const roomIds = userRooms.map(room => `room:${room.room_id}`);

        // Add socket to user's personal room and all chat rooms
        const io = getIO();
        const socket = io.sockets.sockets.get(socketId);

        if (socket) {
            // Join personal user room
            socket.join(`user:${userId}`);

            // Join all chat rooms
            roomIds.forEach(roomId => {
                socket.join(roomId);
            });

            // Update user's online status
            await prisma.user.update({
                where: { user_id: userId },
                data: { lastActive: new Date() }
            });

            // Broadcast to friends that user is online
            const friends = await getFriendIds(userId);
            if (friends.length > 0) {
                friends.forEach(friendId => {
                    io.to(`user:${friendId}`).emit('user:online', {
                        userId,
                        timestamp: new Date()
                    });
                });
            }
        }

        res.json({
            success: true,
            message: 'Socket rooms set up successfully',
            data: {
                userRoom: `user:${userId}`,
                chatRooms: roomIds
            }
        });
    } catch (error) {
        console.error('Error setting up socket rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set up socket rooms',
            error: error.message
        });
    }
};

/**
 * Get chat room details
 * @route GET /api/chat/rooms/:roomId
 */
const getChatRoomDetails = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = parseInt(req.user);

        // Check if user is participant of the room
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this chat room'
            });
        }

        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true,
                                lastActive: true
                            }
                        }
                    }
                },
                creator: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            }
        });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Chat room not found'
            });
        }

        // For DM rooms, explicitly identify the other participant relative to the requesting user
        let otherParticipant = null;
        let currentParticipant = null;

        if (room.type === 'DM') {
            // First, get all participants with their user info
            const allParticipants = room.participants.map(p => ({
                participantId: p.participant_id,
                userId: p.user_id,
                userInfo: p.user
            }));

            // Find the current user's participant object
            currentParticipant = allParticipants.find(p => p.userId === userId);

            // Find the other participant (not the current user)
            const otherParticipantData = allParticipants.find(p => p.userId !== userId);

            if (otherParticipantData && otherParticipantData.userInfo) {
                otherParticipant = otherParticipantData.userInfo;
            }

            console.log(`Room ${roomId} - DM chat`);
            console.log(`Current user: ${userId}, Other user: ${otherParticipant?.user_id}`);
        }

        // Return the room data with the explicitly identified other participant
        res.json({
            success: true,
            data: {
                ...room,
                otherParticipant,
                currentUserId: userId // Include the current user ID to help frontend logic
            }
        });
    } catch (error) {
        console.error('Error fetching chat room details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat room details',
            error: error.message
        });
    }
};

// Helper function to get user's friend IDs
const getFriendIds = async (userId) => {
    const friendships = await prisma.friendRequest.findMany({
        where: {
            OR: [
                { sender_id: userId },
                { receiver_id: userId }
            ],
            status: 'ACCEPTED'
        }    });

    return friendships.map(f =>
        f.sender_id === userId ? f.receiver_id : f.sender_id
    );
};

// controllers/chatController.js

// Create a new group chat
const createGroupChat = async (req, res) => {
    const {
        name,
        description,
        participants,
        is_private = false
    } = req.body;
    const userId = req.user;
    const GROUP_CHAT_COST = 20; // Optional: if you want to charge points for creating a group chat

    if (!name || !participants) {
        return res.status(400).json({
            error: 'Please enter all required details: name and participants.'
        });
    }

    try {
        // Use relative path for avatar
        const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

        const result = await prisma.$transaction(async (prisma) => {
            // Find user
            const user = await prisma.user.findUnique({
                where: { user_id: parseInt(userId) }
            });

            if (!user) throw new Error('User not found');

            // Optional: Point check if implementing point system
            // if (user.points_gained < GROUP_CHAT_COST) throw new Error("Insufficient points to create group chat!");

            // Normalize participants to an array
            const participantsArray = Array.isArray(participants)
                ? participants
                : typeof participants === 'string'
                    ? JSON.parse(participants)
                    : [];

            // Filter out invalid participant IDs
            const validParticipants = participantsArray
                .map(id => parseInt(id))
                .filter(id => !isNaN(id) && id !== parseInt(userId));

            // Ensure current user is included in participants
            const participantSet = new Set([
                ...validParticipants,
                parseInt(userId) // Always add the creator
            ]);

            // Verify all participants exist
            const existingParticipants = await prisma.user.findMany({
                where: {
                    user_id: {
                        in: Array.from(participantSet)
                    }
                },
                select: {
                    user_id: true
                }
            });

            const existingParticipantIds = new Set(
                existingParticipants.map(p => p.user_id)
            );

            // Ensure all participants actually exist in the database
            if (existingParticipantIds.size !== participantSet.size) {
                throw new Error('One or more participants do not exist');
            }

            // Optional: Deduct points if implementing point system
            // const updatedUser = await prisma.user.update({
            //     where: { user_id: parseInt(userId) },
            //     data: { points_gained: user.points_gained - GROUP_CHAT_COST }
            // });

            // Optional: Log points deduction
            // await prisma.pointsLog.create({
            //     data: {
            //         user_id: parseInt(userId),
            //         points: -GROUP_CHAT_COST,
            //         reason: "Group Chat Creation",
            //         description: `Points spent to create group chat: "${name.substring(0, 30)}${name.length > 30 ? '...' : ''}"`,
            //         source_type: "SYSTEM_DEDUCTION"
            //     }
            // });

            // Create the group chat
            const newGroupChat = await prisma.chatRoom.create({
                data: {
                    name,
                    description,
                    type: 'GROUP',
                    is_private,
                    created_by_id: parseInt(userId),
                    avatar: avatarPath,
                    participants: {
                        create: Array.from(participantSet).map(participantId => ({
                            user_id: participantId,
                            isAdmin: participantId === parseInt(userId)
                        }))
                    }
                },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    user_id: true,
                                    user_name: true,
                                    avatar: true
                                }
                            }
                        }
                    }
                }
            });

            // Create a system message about group creation
            await prisma.message.create({
                data: {
                    room_id: newGroupChat.room_id,
                    sender_id: parseInt(userId),
                    content: `${user.user_name} created this group`,
                    message_type: 'SYSTEM'
                }
            });

            return { newGroupChat };
        });

        // Optional: Notify participants via socket
        const io = getIO();
        Array.from(result.newGroupChat.participants.map(p => p.user_id)).forEach(participantId => {
            io.to(`user:${participantId}`).emit('chatRoom:created', result.newGroupChat);
        });

        return res.status(201).json({
            success: true,
            message: 'Group chat created successfully',
            groupChat: result.newGroupChat
        });

    } catch (error) {
        console.error('Error creating group chat:', error);
        return res.status(403).json({
            success: false,
            error: error.message
        });
    }
};


// Add participants to a group chat
const addGroupChatParticipants = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { participants } = req.body;
        const userId = req.user.user_id;

        // Validate input
        if (!participants || participants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No participants provided'
            });
        }

        // Check if user is admin of the group
        const userParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!userParticipant?.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only group admins can add participants'
            });
        }

        // Verify room exists and is a group
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type !== 'GROUP') {
            return res.status(400).json({
                success: false,
                message: 'Can only add participants to group chats'
            });
        }

        // Add new participants
        const addedParticipants = await prisma.chatParticipant.createMany({
            data: participants.map(participantId => ({
                user_id: parseInt(participantId),
                room_id: parseInt(roomId)
            })),
            skipDuplicates: true
        });

        // Fetch added user details
        const addedUsers = await prisma.user.findMany({
            where: {
                user_id: {
                    in: participants.map(id => parseInt(id))
                }
            },
            select: { user_id: true, user_name: true }
        });

        // Create system message about new participants
        const systemMessageContent = `${req.user.user_name} added ${
            addedUsers.map(u => u.user_name).join(', ')
        } to the group`;

        await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content: systemMessageContent,
                message_type: 'SYSTEM'
            }
        });

        // Notify new participants and group members
        const io = getIO();
        const updatedRoom = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Notify room members
        io.to(`room:${roomId}`).emit('participants:added', {
            roomId: parseInt(roomId),
            addedParticipants: addedUsers
        });

        // Notify new participants
        participants.forEach(participantId => {
            io.to(`user:${participantId}`).emit('chatRoom:joined', updatedRoom);
        });

        res.status(200).json({
            success: true,
            data: {
                addedParticipants: addedUsers,
                room: updatedRoom
            }
        });
    } catch (error) {
        console.error('Error adding participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add participants',
            error: error.message
        });
    }
};

// Remove participants from a group chat
const removeGroupChatParticipants = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { participants } = req.body;
        const userId = req.user.user_id;

        // Validate input
        if (!participants || participants.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No participants provided'
            });
        }

        // Check if user is admin of the group
        const userParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!userParticipant?.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only group admins can remove participants'
            });
        }

        // Verify room exists and is a group
        const room = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            select: { type: true }
        });

        if (room.type !== 'GROUP') {
            return res.status(400).json({
                success: false,
                message: 'Can only remove participants from group chats'
            });
        }

        // Fetch removed user details before deletion
        const removedUsers = await prisma.user.findMany({
            where: {
                user_id: {
                    in: participants.map(id => parseInt(id))
                }
            },
            select: { user_id: true, user_name: true }
        });

        // Remove participants
        await prisma.chatParticipant.deleteMany({
            where: {
                room_id: parseInt(roomId),
                user_id: {
                    in: participants.map(id => parseInt(id))
                }
            }
        });

        // Create system message about removed participants
        const systemMessageContent = `${req.user.user_name} removed ${
            removedUsers.map(u => u.user_name).join(', ')
        } from the group`;

        await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content: systemMessageContent,
                message_type: 'SYSTEM'
            }
        });

        // Get updated room details
        const updatedRoom = await prisma.chatRoom.findUnique({
            where: { room_id: parseInt(roomId) },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                user_id: true,
                                user_name: true,
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        // Notify via socket
        const io = getIO();

        // Notify room members about removal
        io.to(`room:${roomId}`).emit('participants:removed', {
            roomId: parseInt(roomId),
            removedParticipants: removedUsers
        });

        // Notify removed participants
        participants.forEach(participantId => {
            io.to(`user:${participantId}`).emit('chatRoom:removed', {
                roomId: parseInt(roomId)
            });
        });

        res.status(200).json({
            success: true,
            data: {
                removedParticipants: removedUsers,
                room: updatedRoom
            }
        });
    } catch (error) {
        console.error('Error removing participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove participants',
            error: error.message
        });
    }
};

// Helper function to generate default group avatar
function generateDefaultGroupAvatar(groupName) {
    // Generate a placeholder avatar based on group name
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName)}&background=random`;
}

// In chatController.js
const getGroupChatParticipants = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.user_id;

        // Check if user is a participant
        const isParticipant = await prisma.chatParticipant.findUnique({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            }
        });

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view participants'
            });
        }

        // Fetch participants
        const participants = await prisma.chatParticipant.findMany({
            where: { room_id: parseInt(roomId) },
            include: {
                user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true,
                        lastActive: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: participants
        });
    } catch (error) {
        console.error('Error fetching group chat participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch participants',
            error: error.message
        });
    }
};

const searchPotentialParticipants = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { search = '' } = req.query;
        const userId = req.user.user_id;

        // Get existing participants
        const existingParticipants = await prisma.chatParticipant.findMany({
            where: { room_id: parseInt(roomId) },
            select: { user_id: true }
        });
        const existingParticipantIds = existingParticipants.map(p => p.user_id);

        // Find potential participants (friends not in the group)
        const potentialParticipants = await prisma.user.findMany({
            where: {
                NOT: {
                    user_id: {
                        in: [...existingParticipantIds, userId]
                    }
                },
                OR: [
                    { user_name: { contains: search, mode: 'insensitive' } },
                    { user_email: { contains: search, mode: 'insensitive' } }
                ]
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                lastActive: true
            },
            take: 10 // Limit results
        });

        res.json({
            success: true,
            data: potentialParticipants
        });
    } catch (error) {
        console.error('Error searching potential participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search participants',
            error: error.message
        });
    }
};

const getBlockedContacts = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const blockedUsers = await prisma.blockedUser.findMany({
            where: { blocked_by: userId },
            include: {
                blocked_user: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            }
        });

        res.json({
            success: true,
            data: blockedUsers.map(b => b.blocked_user)
        });
    } catch (error) {
        console.error('Error fetching blocked contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blocked contacts',
            error: error.message
        });
    }
};

const blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const blockedById = req.user.user_id;

        // Check if already blocked
        const existingBlock = await prisma.blockedUser.findUnique({
            where: {
                blocked_by_blocked_user_unique: {
                    blocked_by: blockedById,
                    blocked_user_id: parseInt(userId)
                }
            }
        });

        if (existingBlock) {
            return res.status(400).json({
                success: false,
                message: 'User is already blocked'
            });
        }

        // Block the user
        await prisma.blockedUser.create({
            data: {
                blocked_by: blockedById,
                blocked_user_id: parseInt(userId)
            }
        });

        // Close any existing chat rooms with this user
        const existingRooms = await prisma.chatRoom.findMany({
            where: {
                type: 'DM',
                participants: {
                    every: {
                        user_id: {
                            in: [blockedById, parseInt(userId)]
                        }
                    }
                }
            }
        });

        // Notify and potentially close existing chats
        const io = getIO();
        existingRooms.forEach(async (room) => {
            io.to(`room:${room.room_id}`).emit('chat:blocked', {
                roomId: room.room_id,
                blockedUserId: parseInt(userId)
            });
        });

        res.json({
            success: true,
            message: 'User blocked successfully'
        });
    } catch (error) {
        console.error('Error blocking user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to block user',
            error: error.message
        });
    }
};

const unblockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const blockedById = req.user.user_id;

        // Remove block
        await prisma.blockedUser.delete({
            where: {
                blocked_by_blocked_user_unique: {
                    blocked_by: blockedById,
                    blocked_user_id: parseInt(userId)
                }
            }
        });

        res.json({
            success: true,
            message: 'User unblocked successfully'
        });
    } catch (error) {
        console.error('Error unblocking user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unblock user',
            error: error.message
        });
    }
};

const getPotentialChatRecipients = async (req, res) => {
    try {
        const userId = parseInt(req.user);
        const { search = '' } = req.query;

        // Find friends through accepted friend requests
        const potentialRecipients = await prisma.user.findMany({
            where: {
                NOT: {
                    user_id: userId
                },
                // Find friends through accepted friend requests
                OR: [
                    {
                        // Users who received and accepted requests from the current user
                        receivedFriendRequests: {
                            some: {
                                sender_id: userId,
                                status: 'ACCEPTED'
                            }
                        }
                    },
                    {
                        // Users who sent and got accepted requests to the current user
                        sentFriendRequests: {
                            some: {
                                receiver_id: userId,
                                status: 'ACCEPTED'
                            }
                        }
                    }
                ],
                // Optional search filter for user name
                ...(search ? {
                    user_name: {
                        contains: search,
                        mode: 'insensitive'
                    }
                } : {})
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                lastActive: true
            }
        });

        // Return the friends data
        res.json({
            success: true,
            data: potentialRecipients
        });
    } catch (error) {
        console.error('Error fetching potential chat recipients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch potential chat recipients',
            error: error.message
        });
    }
};


module.exports = {
    createChatRoom,
    createDirectChat,
    getUserChatRooms,
    getChatRoomDetails,
    getChatMessages,
    updateChatRoom,
    updateChatParticipants,
    updateParticipantRole,
    leaveChat,
    deleteMessage,
    markMessagesAsRead,
    sendMessage,
    uploadMedia,
    updateTypingStatus,
    editMessage,
    setupUserSocket,
    createGroupChat,
    addGroupChatParticipants,
    removeGroupChatParticipants,
    getGroupChatParticipants,
    searchPotentialParticipants,
    getBlockedContacts,
    blockUser,
    unblockUser,
    getPotentialChatRecipients
};