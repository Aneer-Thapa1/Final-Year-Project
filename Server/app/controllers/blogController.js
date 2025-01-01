import res from "express/lib/response";
import req from "express/lib/request";

const prisma = new PrismaClient();

const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

//  function to add blog
const addBlog = async (req, res) => {

    // getting data from front end
    const {blog_title, blog_description, blog_image} = req.body;

    // getting user_id extracted from middleware
    const user_id = req.user.user_id;

    // Check if all necessary fields are filled
    if (!blog_title || !blog_description) {
        return res.status(400).json({error: 'Please enter all details including title, description.'});
    }

    try {
        // starting transition query so that points_gained do not change in error
        const result = await prisma.$transaction(async (prisma) => {
            const user = await prisma.user.findUnique({
                where: {id: user_id}
            });


            // checking if user with that user_id exists or not
            if (!user) {
                throw new Error('User not found');
            }

            // logic to make sure if user have enough points to add a blog to prevent spam and unwanted blogs
            if (user.points_gained < 20) {
                throw new Error("You do not meet the requirement to add a blog!");
            }

            // Update user points by deducting 20 points
            const updatedUser = await prisma.user.update({
                where: {id: user_id},
                data: {points_gained: user.points_gained - 20}
            });

            // Add new blog entry
            const newBlog = await prisma.blog.create({
                data: {
                    blog_title,
                    blog_description,
                    blog_image,
                    user_id: user_id
                }
            });

            return {updatedUser, newBlog};
        });

        // If transaction is successful
        return res.status(201).json({success: 'Blog added successfully', blog: result.newBlog});

    } catch (error) {
        // Transaction failed
        return res.status(403).json({error: error.message});
    }
};

// function to retrive blogs for a user
const getBlogs = async (req, res) => {
    const user_id = req.user.user_id;
    const lastLoadedBlogId = parseInt(req.query.lastLoadedBlogId); // Last loaded blog's ID
    const limit = parseInt(req.query.limit) || 7;

    try {
        const blogs = await prisma.blog.findMany({
            where: {
                user_id: {
                    not: user_id
                },
                blog_id: {
                    gt: lastLoadedBlogId  // Greater than the last loaded blog's ID
                }
            },
            include: {
                user: true
            },
            take: limit,
            orderBy: {
                id: 'asc'  // Assuming newer blogs have higher IDs
            }
        });

        if (blogs.length === 0) {
            return res.status(404).json({message: "No more blogs found"});
        }

        res.status(200).json(blogs);
    } catch (error) {
        res.status(500).json({error: 'An error occurred while retrieving blogs'});
    }
};


const editBlog = async (req, res) => {

    const blog_id = req.params.blog_id;
    const {blog_title, blog_description, blog_image} = req.body;


}
module.exports = {addBlog, getBlogs};


