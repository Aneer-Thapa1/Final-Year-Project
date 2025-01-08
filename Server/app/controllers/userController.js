const {PrismaClient} = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const {sendMail} = require('../utils/emailService')


const prisma = new PrismaClient();

const register = async (req, res) => {
    const { user_name, user_email, gender, password } = req.body;

    console.log(user_name, user_email, gender, password)


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

        // Start a transaction for creating the user in the database
        const newUser = await prisma.user.create({
            data: {
                user_name: user_name.trim(),
                user_email: user_email.toLowerCase().trim(),
                password: hashedPassword,
                gender,
                points_gained: 100,
                avatar: "https://example.com/default-avatar.png",
            }
        });

        // Send the welcome email (done after the transaction)
        await sendMail(newUser.user_email, 'welcome', { user_name: newUser.user_name });

        // Generate JWT token


        // Remove sensitive data
        const { password: _, ...userData } = newUser;

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: {
                user: userData,

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
    const {user_email, password, device_token} = req.body;

    if (!user_email?.trim() || !password) {
        return res.status(400).json({
            success: false,
            error: "Email and password are required"
        });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {user_email: user_email.toLowerCase().trim()}
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


        const {password: _, ...userData} = user;

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userData,
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
            where: {user_id: req.user.id}
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
            data: {token}
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({
            success: false,
            error: "Unable to refresh token"
        });
    }
};

module.exports = {register, login, refreshToken};