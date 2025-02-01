import res from "express/lib/response";
import req from "express/lib/request";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const addHabit = async (req, res) => {
    const user_id = req.user.id;

    const {habit_name, habit_desc} = req.body;

    if (!habit_name || !habit_desc) {
        return res.status(400).json({"error": "Please fill all required fields"});
    }

    const user = await prisma.user.findFirst(user_id);


    if(!user){
        return res.status(400).json({"error": "User not found"});
    }



};

module.exports = {addHabit}
