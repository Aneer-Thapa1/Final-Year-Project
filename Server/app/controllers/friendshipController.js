const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const addFriend = async (req, res) => {
    const {user_id } = req.body
    const sender_id = req.user.id

    const sender = await prisma.user.findFirst(sender_id)

    const reciver = await prisma.user.findFirst(user_id)


}