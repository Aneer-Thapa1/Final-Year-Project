// src/controllers/friendshipController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Send a friend request to another user
 * @route POST /api/friends/request
 */
const sendFriendRequest = async (req, res) => {
    try {
        const { user_id: receiver_id } = req.body;
        // Make sure we're using the right user ID field from the auth middleware
        const sender_id = parseInt(req.user)|| parseInt(req.user.user_id);

        // Prevent self-friending
        if (sender_id === receiver_id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself'
            });
        }

        // Find both users in a single query using Prisma's findMany with "in" operator
        const users = await prisma.user.findMany({
            where: {
                user_id: {
                    in: [sender_id, receiver_id]
                }
            }
        });

        // Check if both users exist
        if (users.length !== 2) {
            return res.status(404).json({
                success: false,
                message: 'One or both users not found'
            });
        }

        // Check existing relationship status
        const existingRelationship = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { sender_id, receiver_id },
                    { sender_id: receiver_id, receiver_id: sender_id }
                ]
            }
        });

        // Handle existing relationships
        if (existingRelationship) {
            // Already friends
            if (existingRelationship.status === 'ACCEPTED') {
                return res.status(400).json({
                    success: false,
                    message: 'Already friends'
                });
            }

            // Current user already sent a request
            if (existingRelationship.sender_id === sender_id &&
                existingRelationship.status === 'PENDING') {
                return res.status(400).json({
                    success: false,
                    message: 'Friend request already sent'
                });
            }

            // Handle case where receiver already sent a request to sender (auto-accept)
            if (existingRelationship.sender_id === receiver_id &&
                existingRelationship.status === 'PENDING') {

                // Use transaction to ensure both operations complete
                const result = await prisma.$transaction([
                    // Update the request status
                    prisma.friendRequest.update({
                        where: { request_id: existingRelationship.request_id },
                        data: { status: 'ACCEPTED' }
                    }),

                    // Create notification
                    prisma.notification.create({
                        data: {
                            user_id: receiver_id,
                            title: 'Friend Request Accepted',
                            content: `You are now friends with ${users.find(u => u.user_id === sender_id)?.user_name || 'a user'}`,
                            type: 'FRIEND_REQUEST',
                            related_id: existingRelationship.request_id
                        }
                    })
                ]);

                return res.status(200).json({
                    success: true,
                    message: 'Friend request from this user was accepted automatically',
                    data: result[0]
                });
            }
        }

        // Create a new friend request and notification in a transaction
        const senderUser = users.find(u => u.user_id === sender_id);
        const [friendRequest, notification] = await prisma.$transaction([
            prisma.friendRequest.create({
                data: {
                    sender_id,
                    receiver_id,
                    status: 'PENDING'
                }
            }),

            prisma.notification.create({
                data: {
                    user_id: receiver_id,
                    title: 'New Friend Request',
                    content: `${senderUser?.user_name || 'Someone'} sent you a friend request`,
                    type: 'FRIEND_REQUEST'
                }
            })
        ]);

        return res.status(201).json({
            success: true,
            message: 'Friend request sent successfully',
            data: friendRequest
        });

    } catch (error) {
        console.error('Error sending friend request:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error processing friend request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Respond to a friend request (accept or reject)
 * @route PATCH /api/friends/respond
 */
const respondToFriendRequest = async (req, res) => {
    try {
        const { request_id, status } = req.body;
        const user_id = req.user.id || req.user.user_id;

        // Validate status
        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Use "ACCEPTED" or "REJECTED".'
            });
        }

        // Find the friend request with sender information
        const friendRequest = await prisma.friendRequest.findFirst({
            where: {
                request_id,
                receiver_id: user_id,
                status: 'PENDING'
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

        // Check if request exists
        if (!friendRequest) {
            return res.status(404).json({
                success: false,
                message: 'No pending friend request found or you are not the receiver'
            });
        }

        // Get the current user's name
        const currentUser = await prisma.user.findUnique({
            where: { user_id },
            select: { user_name: true }
        });

        // Use transaction to update request and create notification
        const [updatedRequest, notification] = await prisma.$transaction([
            // Update request status
            prisma.friendRequest.update({
                where: { request_id },
                data: { status }
            }),

            // Create notification for sender
            prisma.notification.create({
                data: {
                    user_id: friendRequest.sender_id,
                    title: status === 'ACCEPTED' ? 'Friend Request Accepted' : 'Friend Request Declined',
                    content: status === 'ACCEPTED'
                        ? `${currentUser?.user_name || 'User'} accepted your friend request`
                        : `${currentUser?.user_name || 'User'} declined your friend request`,
                    type: 'FRIEND_REQUEST',
                    related_id: request_id
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: `Friend request ${status.toLowerCase()} successfully`,
            data: updatedRequest
        });

    } catch (error) {
        console.error('Error responding to friend request:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error processing request response',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all friends for the logged-in user
 * @route GET /api/friends
 */
const getFriends = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id;

        // Find all accepted friend requests where user is either sender or receiver
        const friendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true,
                        lastActive: true,
                        premium_status: true
                    }
                },
                receiver: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true,
                        lastActive: true,
                        premium_status: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc' // Most recent friendships first
            }
        });

        // Transform to clean friend list
        const friends = friendships.map(friendship => {
            // Determine which user is the friend (the one that is not the current user)
            const friend = friendship.sender_id === user_id
                ? friendship.receiver
                : friendship.sender;

            // Handle case where friend might be null
            if (!friend) {
                console.error(`Friend not found for friendship: ${JSON.stringify(friendship)}`);
                return null;
            }

            return {
                user_id: friend.user_id,
                user_name: friend.user_name,
                avatar: friend.avatar,
                lastActive: friend.lastActive,
                premium_status: friend.premium_status,
                friendship_date: friendship.updatedAt,
                friendship_id: friendship.request_id
            };
        }).filter(Boolean); // Remove any null entries

        return res.status(200).json({
            success: true,
            count: friends.length,
            data: friends
        });

    } catch (error) {
        console.error('Error fetching friends:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error fetching friends',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get pending friend requests for the logged-in user
 * @route GET /api/friends/requests
 */
const getPendingRequests = async (req, res) => {
    try {
        const user_id = parseInt(req.user) || parseInt(req.user.user_id);

        // Get requests sent to the user that are still pending
        const pendingRequests = await prisma.friendRequest.findMany({
            where: {
                receiver_id: user_id,
                status: 'PENDING'
            },
            include: {
                sender: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Check for any missing sender data
        const validRequests = pendingRequests.filter(request => !!request.sender);

        return res.status(200).json({
            success: true,
            count: validRequests.length,
            data: validRequests
        });

    } catch (error) {
        console.error('Error fetching pending requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error fetching pending requests',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get sent friend requests from the logged-in user
 * @route GET /api/friends/sent-requests
 */
const getSentRequests = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id;

        // Get requests sent by the user that are still pending
        const sentRequests = await prisma.friendRequest.findMany({
            where: {
                sender_id: user_id,
                status: 'PENDING'
            },
            include: {
                receiver: {
                    select: {
                        user_id: true,
                        user_name: true,
                        avatar: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Check for any missing receiver data
        const validRequests = sentRequests.filter(request => !!request.receiver);

        return res.status(200).json({
            success: true,
            count: validRequests.length,
            data: validRequests
        });

    } catch (error) {
        console.error('Error fetching sent requests:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error fetching sent requests',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Search for users to add as friends
 * @route GET /api/friends/search
 */
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const user_id = parseInt(req.user) || parseInt(req.user.user_id);

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        // Get existing friendship IDs to exclude current friends
        const existingFriendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        // Create array of user IDs to exclude (current user + friends)
        const excludeIds = [user_id];
        existingFriendships.forEach(friendship => {
            if (friendship.sender_id === user_id) {
                excludeIds.push(friendship.receiver_id);
            } else {
                excludeIds.push(friendship.sender_id);
            }
        });

        // Search users
        const users = await prisma.user.findMany({
            where: {
                user_id: {
                    notIn: excludeIds
                },
                OR: [
                    {
                        user_name: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    },
                    {
                        user_email: {
                            contains: query,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                premium_status: true,
                lastActive: true
            },
            take: 10 // Limit results
        });

        // Get pending friend requests to mark users who already have a pending request
        const pendingRequests = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    {
                        sender_id: user_id,
                        receiver_id: {
                            in: users.map(u => u.user_id)
                        }
                    },
                    {
                        receiver_id: user_id,
                        sender_id: {
                            in: users.map(u => u.user_id)
                        }
                    }
                ],
                status: 'PENDING'
            }
        });

        // Enhance user objects with pending request status
        const enhancedUsers = users.map(user => {
            const sentRequest = pendingRequests.find(
                r => r.sender_id === user_id && r.receiver_id === user.user_id
            );

            const receivedRequest = pendingRequests.find(
                r => r.receiver_id === user_id && r.sender_id === user.user_id
            );

            return {
                ...user,
                request_sent: !!sentRequest,
                request_received: !!receivedRequest,
                request_id: sentRequest?.request_id || receivedRequest?.request_id
            };
        });

        return res.status(200).json({
            success: true,
            count: enhancedUsers.length,
            data: enhancedUsers
        });

    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error searching users',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get friend suggestions for the logged-in user
 * @route GET /api/friends/suggestions
 */
const getFriendSuggestions = async (req, res) => {
    try {
        const user_id = parseInt(req.user) || parseInt(req.user.user_id);
        const limit = parseInt(req.query.limit) || 5;

        // Get IDs of existing friends and pending requests
        const existingConnections = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ]
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        // Create array of user IDs to exclude (current user + connections)
        const excludeIds = [user_id];
        existingConnections.forEach(connection => {
            if (connection.sender_id === user_id) {
                excludeIds.push(connection.receiver_id);
            } else {
                excludeIds.push(connection.sender_id);
            }
        });

        // Get a list of all friends of the current user (for mutual friend calculation)
        const userFriends = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        const friendIds = userFriends.map(f =>
            f.sender_id === user_id ? f.receiver_id : f.sender_id
        );

        // Get suggested users and count mutual friends
        const suggestions = await prisma.user.findMany({
            where: {
                user_id: {
                    notIn: excludeIds
                }
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                premium_status: true,
                lastActive: true,
                totalHabitsCreated: true,
                currentDailyStreak: true
            },
            take: limit
        });

        // Calculate mutual friends for each suggestion
        const suggestionsWithMutual = await Promise.all(suggestions.map(async (user) => {
            // Find friends of this suggested user
            const theirFriends = await prisma.friendRequest.findMany({
                where: {
                    OR: [
                        { sender_id: user.user_id },
                        { receiver_id: user.user_id }
                    ],
                    status: 'ACCEPTED'
                },
                select: {
                    sender_id: true,
                    receiver_id: true
                }
            });

            const theirFriendIds = theirFriends.map(f =>
                f.sender_id === user.user_id ? f.receiver_id : f.sender_id
            );

            // Count mutual friends
            const mutualFriends = theirFriendIds.filter(id => friendIds.includes(id)).length;

            return {
                ...user,
                mutualFriends
            };
        }));

        // Sort by mutual friends count (highest first)
        suggestionsWithMutual.sort((a, b) => b.mutualFriends - a.mutualFriends);

        return res.status(200).json({
            success: true,
            count: suggestionsWithMutual.length,
            data: suggestionsWithMutual
        });

    } catch (error) {
        console.error('Error getting friend suggestions:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error getting friend suggestions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get mutual friends with a specific user
 * @route GET /api/friends/mutual/:userId
 */
const getMutualFriends = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id;
        const other_user_id = parseInt(req.params.userId);

        // Make sure the other user exists
        const otherUser = await prisma.user.findUnique({
            where: { user_id: other_user_id }
        });

        if (!otherUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get friends of current user
        const userFriendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        const userFriendIds = userFriendships.map(f =>
            f.sender_id === user_id ? f.receiver_id : f.sender_id
        );

        // Get friends of other user
        const otherUserFriendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: other_user_id },
                    { receiver_id: other_user_id }
                ],
                status: 'ACCEPTED'
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        const otherUserFriendIds = otherUserFriendships.map(f =>
            f.sender_id === other_user_id ? f.receiver_id : f.sender_id
        );

        // Find mutual friends
        const mutualFriendIds = userFriendIds.filter(id => otherUserFriendIds.includes(id));

        // Get details of mutual friends
        const mutualFriends = await prisma.user.findMany({
            where: {
                user_id: {
                    in: mutualFriendIds
                }
            },
            select: {
                user_id: true,
                user_name: true,
                avatar: true,
                premium_status: true,
                lastActive: true
            }
        });

        return res.status(200).json({
            success: true,
            count: mutualFriends.length,
            data: mutualFriends
        });

    } catch (error) {
        console.error('Error getting mutual friends:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error getting mutual friends',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get friendship statistics for the logged-in user
 * @route GET /api/friends/stats
 */
const getFriendshipStats = async (req, res) => {
    try {
        const user_id = req.user.id || req.user.user_id;
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Count total friends
        const totalFriends = await prisma.friendRequest.count({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            }
        });

        // Count pending friend requests
        const pendingRequests = await prisma.friendRequest.count({
            where: {
                receiver_id: user_id,
                status: 'PENDING'
            }
        });

        // Count active friends (active in the last 7 days)
        const friendships = await prisma.friendRequest.findMany({
            where: {
                OR: [
                    { sender_id: user_id },
                    { receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            },
            select: {
                sender_id: true,
                receiver_id: true
            }
        });

        // Extract friend IDs from friendships, handling nulls
        const friendIdList = [];
        for (const friendship of friendships) {
            if (friendship.sender_id === user_id && friendship.receiver_id) {
                friendIdList.push(friendship.receiver_id);
            } else if (friendship.receiver_id === user_id && friendship.sender_id) {
                friendIdList.push(friendship.sender_id);
            }
        }

        // Count active friends
        const activeFriends = friendIdList.length > 0 ?
            await prisma.user.count({
                where: {
                    user_id: {
                        in: friendIdList
                    },
                    lastActive: {
                        gte: oneWeekAgo
                    }
                }
            }) : 0;

        return res.status(200).json({
            success: true,
            data: {
                totalFriends,
                pendingRequests,
                activeFriends
            }
        });

    } catch (error) {
        console.error('Error getting friendship stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error getting friendship stats',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Remove a friend
 * @route DELETE /api/friends/:friendId
 */
const removeFriend = async (req, res) => {
    try {
        const friend_id = parseInt(req.params.friendId);
        const user_id = req.user.id || req.user.user_id;

        // Find the friendship
        const friendship = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { sender_id: user_id, receiver_id: friend_id },
                    { sender_id: friend_id, receiver_id: user_id }
                ],
                status: 'ACCEPTED'
            }
        });

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found'
            });
        }

        // Delete the friendship record
        await prisma.friendRequest.delete({
            where: {
                request_id: friendship.request_id
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Friend removed successfully'
        });

    } catch (error) {
        console.error('Error removing friend:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error removing friend',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    sendFriendRequest,
    respondToFriendRequest,
    getFriends,
    getPendingRequests,
    getSentRequests,
    searchUsers,
    getFriendSuggestions,
    getMutualFriends,
    getFriendshipStats,
    removeFriend
};