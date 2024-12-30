// importing necessary libraries
import {PrismaClient} from "@prisma/client";
import res from "express/lib/response";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

const signin = async (req, res) => {
    const {user_name, user_email, gender, password} = req.body;

    // Check for missing fields
    if (!user_name || !user_email || !gender || !password) {
        return res.status(400).json({error: "Please fill all the fields!"});
    }

    try {
        // Check if user already exists
        const user = await prisma.user.findFirst({
            where: {user_email: user_email}
        });

        if (user) {
            return res.status(400).json({error: "User already exists!"});
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);




        // Create a new user
        const newUser = await prisma.user.create({
            data: {
                user_name: user_name,
                user_email: user_email,
                password: hashedPassword,
                gender: gender
            }
        });

        // Respond with success
        return res.status(201).json({message: "User registered successfully."});
    } catch (e) {
        console.error(e);
        return res.status(500).json({error: "Internal Server Error!"});
    }
};


const login = async (req, res) => {
    const {user_email, password} = req.body;

    // Check for missing fields
    if (!user_email || !password) {
        return res.status(400).json({error: "Please fill all the fields!"});
    }

    try {
        // Find the user by email
        const user = await prisma.user.findFirst({
            where: {user_email: user_email}
        });

        // Check if user exists
        if (!user) {
            return res.status(400).json({error: "User does not exist!"});
        }

        // Check if password matches
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(400).json({error: "Wrong password!"});
        }

        const token = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Successful login
        res.status(200).json({message: "User logged in successfully."});
    } catch (e) {
        console.error(e);
        return res.status(500).json({error: "Internal Server Error!"});
    }
};
