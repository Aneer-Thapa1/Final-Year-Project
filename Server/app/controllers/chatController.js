
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getIO } = require('../config/socketConfig');

// Create a new chat room (DM or Group)
const createChatRoom = async (req, res) => {
    try {
        const { name, type, participants } = req.body;
        const userId = req.user.user_id;

        const chatRoom = await prisma.chatRoom.create({
            data: {
                name: type === 'GROUP' ? name : null,
                type,
                participants: {
                    create: [
                        { user_id: userId, is_admin: true },
                        ...participants.map(participantId => ({
                            user_id: participantId
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
                                avatar: true
                            }
                        }
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            data: chatRoom
        });
    } catch (error) {
        console.error('Error creating chat room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chat room'
        });
    }
};

// Get all chat rooms for a user
const getUserChatRooms = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const chatRooms = await prisma.chatRoom.findMany({
            where: {
                participants: {
                    some: {
                        user_id: userId
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
                                avatar: true
                            }
                        }
                    }
                },
                messages: {
                    take: 1,
                    orderBy: {
                        created_at: 'desc'
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
            },
            orderBy: {
                updated_at: 'desc'
            }
        });

        res.json({
            success: true,
            data: chatRooms
        });
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat rooms'
        });
    }
};

// Get messages for a specific chat room
const getChatMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { cursor, limit = 50 } = req.query;
        const userId = req.user.user_id;

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
                    created_at: {
                        lt: new Date(cursor)
                    }
                } : {})
            },
            take: parseInt(limit),
            orderBy: {
                created_at: 'desc'
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                },
                reactions: {
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

        await prisma.chatParticipant.update({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            },
            data: {
                last_read_at: new Date()
            }
        });

        res.json({
            success: true,
            data: messages,
            hasMore: messages.length === parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
};

// Update chat participants
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

        if (!userParticipant?.is_admin) {
            return res.status(403).json({
                success: false,
                message: 'Only admins can modify participants'
            });
        }

        if (addParticipants.length > 0) {
            await prisma.chatParticipant.createMany({
                data: addParticipants.map(participantId => ({
                    user_id: participantId,
                    room_id: parseInt(roomId)
                })),
                skipDuplicates: true
            });
        }

        if (removeParticipants.length > 0) {
            await prisma.chatParticipant.deleteMany({
                where: {
                    room_id: parseInt(roomId),
                    user_id: {
                        in: removeParticipants
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

        res.json({
            success: true,
            data: updatedRoom
        });
    } catch (error) {
        console.error('Error updating participants:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update participants'
        });
    }
};

// Delete a message
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.user_id;

        const message = await prisma.message.findUnique({
            where: { message_id: parseInt(messageId) }
        });

        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        if (message.sender_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Can only delete own messages'
            });
        }

        await prisma.message.delete({
            where: { message_id: parseInt(messageId) }
        });

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
    try {
        const { roomId } = req.params;
        const userId = req.user.user_id;

        await prisma.chatParticipant.update({
            where: {
                user_id_room_id: {
                    user_id: userId,
                    room_id: parseInt(roomId)
                }
            },
            data: {
                last_read_at: new Date()
            }
        });

        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read'
        });
    }
};

// Add reaction to message
const addMessageReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.user_id;

        const reaction = await prisma.messageReaction.create({
            data: {
                message_id: parseInt(messageId),
                user_id: userId,
                emoji
            },
            include: {
                user: {
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
            data: reaction
        });
    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add reaction'
        });
    }
};

// Remove reaction from message
const removeMessageReaction = async (req, res) => {
    try {
        const { messageId, emoji } = req.params;
        const userId = req.user.user_id;

        await prisma.messageReaction.delete({
            where: {
                message_id_user_id_emoji: {
                    message_id: parseInt(messageId),
                    user_id: userId,
                    emoji
                }
            }
        });

        res.json({
            success: true,
            message: 'Reaction removed successfully'
        });
    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove reaction'
        });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { content, replyToId } = req.body;
        const userId = req.user.user_id;
        const files = req.files; // From multer

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
            // Clean up uploaded files if any
            if (files?.length) {
                files.forEach(file => {
                    fs.unlinkSync(file.path);
                });
            }
            return res.status(403).json({
                success: false,
                message: 'Not authorized to send messages in this chat room'
            });
        }

        // Process file uploads if any
        let fileUrls = [];
        if (files?.length) {
            fileUrls = files.map(file => `/uploads/${file.filename}`);
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                room_id: parseInt(roomId),
                sender_id: userId,
                content,
                message_type: files?.length ? 'FILE' : 'TEXT',
                files: fileUrls,
                reply_to_id: replyToId ? parseInt(replyToId) : null
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

        // Update room's last activity
        await prisma.chatRoom.update({
            where: { room_id: parseInt(roomId) },
            data: { updated_at: new Date() }
        });

        // Emit message to all room participants via socket
        const io = getIO();
        io.to(`room:${roomId}`).emit('message:received', message);

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        // Clean up uploaded files if any
        if (req.files?.length) {
            req.files.forEach(file => {
                fs.unlinkSync(file.path);
            });
        }

        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};

module.exports = {
    createChatRoom,
    getUserChatRooms,
    getChatMessages,
    updateChatParticipants,
    deleteMessage,
    markMessagesAsRead,
    addMessageReaction,
    removeMessageReaction,
    sendMessage
};