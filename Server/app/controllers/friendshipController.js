const {PrismaClient} = require("@prisma/client");
const prisma = new PrismaClient();


const addFriend = async (req, res) => {
    try {
        // Get the user_id of the person who will receive the friend request
        const { user_id } = req.body;
        // Get the ID of the person sending the friend request (logged-in user)
        const sender_id = req.user.id;

        // Find the sender in the database
        const sender = await prisma.user.findFirst({ where: { user_id: sender_id } });
        // Find the receiver in the database
        const receiver = await prisma.user.findFirst({ where: { user_id } });

        // If either the sender or receiver does not exist, stop and show an error
        if (!sender || !receiver) {
            return res.status(404).json({ error: 'Sender or receiver not found.' });
        }

        // Check if a friend request was already sent to this user and is still pending
        const existingRequest = await prisma.friendRequest.findFirst({
            where: {
                sender_id, // The person who sent the request
                receiver_id: user_id, // The person receiving the request
                request_status: 'PENDING', // Only check if the request is still waiting for approval
            },
        });

        // If a request is already sent, stop and show an error message
        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already sent.' });
        }

        // Create a new friend request in the database
        const sendRequest = await prisma.friendRequest.create({
            data: {
                sender_id, // The sender's ID
                receiver_id: user_id, // The receiver's ID
                request_status: 'PENDING', // Default status is pending
            },
        });

        // Send back a success message along with the created friend request details
        return res.status(201).json({ message: 'Friend request sent.', request: sendRequest });

    } catch (error) {
        // If something goes wrong, show an error message and log the issue in the console
        console.error('Error sending friend request:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};


const updateFriendRequestStatus = async (req, res) => {
    try {
        // Get sender's ID (the person who sent the friend request) and new status from request body
        const { senderId, status } = req.body;

        // Get receiver's ID (the logged-in user who is responding to the request)
        const receiverId = req.user.id;

        // Validate that the status is either "ACCEPTED" or "REJECTED"
        if (!['ACCEPTED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use "ACCEPTED" or "REJECTED".' });
        }

        // Check if a pending friend request exists between the sender and receiver
        const friendRequest = await prisma.friendRequest.findFirst({
            where: {
                sender_id: senderId, // The person who sent the request
                receiver_id: receiverId, // The person responding to the request
                request_status: 'PENDING', // Only update if it's still pending
            },
        });

        // If no pending request is found, return an error
        if (!friendRequest) {
            return res.status(404).json({ error: 'No pending friend request found.' });
        }

        // Update the friend request status (ACCEPTED or REJECTED)
        await prisma.friendRequest.update({
            where: { request_id: friendRequest.request_id }, // Find request by its unique ID
            data: { request_status: status }, // Update the status
        });

        // Send success response
        return res.status(200).json({ message: `Friend request ${status.toLowerCase()} successfully.` });

    } catch (error) {
        // Handle errors and log them for debugging
        console.error('Error updating friend request:', error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    addFriend,
    updateFriendRequestStatus,
}
