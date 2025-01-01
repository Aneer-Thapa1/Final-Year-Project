import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


const sendEmail = require('../utils/emailService')


const prisma = new PrismaClient();

const register = async (req, res) => {
    const { user_name, user_email, gender, password, device_token } = req.body;

    // Input validation
    if (!user_name?.trim() || !user_email?.trim() || !gender || !password) {
        return res.status(400).json({
            success: false,
            error: "Please fill all the required fields"
        });
    }

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: { user_email: user_email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "Email already registered"
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create a new user
        const newUser = await prisma.user.create({
            data: {
                user_name: user_name.trim(),
                user_email: user_email.toLowerCase().trim(),
                password: hashedPassword,
                gender,
                device_token,
                last_login: new Date()
            }
        });

        await sendEmail(
            email: newUser.user_email,


        )

        // Generate JWT token
        const token = jwt.sign(
            {
                id: newUser.user_id,
                email: newUser.user_email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '30d' // Longer expiry for mobile apps
            }
        );

        // Remove sensitive data
        const { password: _, ...userData } = newUser;

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: {
                user: userData,
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to complete registration"
        });
    }
};

const login = async (req, res) => {
    const { user_email, password, device_token } = req.body;

    if (!user_email?.trim() || !password) {
        return res.status(400).json({
            success: false,
            error: "Email and password are required"
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: { user_email: user_email.toLowerCase().trim() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: "Invalid credentials"
            });
        }

        // Update last login and device token
        await prisma.user.update({
            where: { user_id: user.user_id },
            data: {
                last_login: new Date(),
                device_token: device_token || user.device_token
            }
        });

        const token = jwt.sign(
            {
                id: user.user_id,
                email: user.user_email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '30d'
            }
        );

        const { password: _, ...userData } = user;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to complete login"
        });
    }
};

// Refresh token endpoint - useful for mobile apps
const refreshToken = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { user_id: req.user.id }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "User not found"
            });
        }

        const token = jwt.sign(
            {
                id: user.user_id,
                email: user.user_email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '30d'
            }
        );

        return res.status(200).json({
            success: true,
            data: { token }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to refresh token"
        });
    }
};

export { register, login, refreshToken };