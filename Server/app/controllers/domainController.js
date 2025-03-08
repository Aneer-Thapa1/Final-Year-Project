// src/controllers/domainController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all habit domains
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with domains data or error
 */
const getAllDomains = async (req, res) => {
    try {
        const domains = await prisma.habitDomain.findMany({
            orderBy: { sortOrder: 'asc' }
        });

        return res.status(200).json({
            success: true,
            data: domains
        });
    } catch (error) {
        console.error('Error fetching domains:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve domains',
            error: error.message
        });
    }
};

/**
 * Get a single domain by ID
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with domain data or error
 */
const getDomainById = async (req, res) => {
    try {
        const { domainId } = req.params;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        const domain = await prisma.habitDomain.findUnique({
            where: { domain_id: parseInt(domainId, 10) }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        return res.status(200).json({
            success: true,
            data: domain
        });
    } catch (error) {
        console.error('Error fetching domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve domain',
            error: error.message
        });
    }
};

/**
 * Create a new domain (admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with new domain data or error
 */
const createDomain = async (req, res) => {
    try {
        // Check if user is admin (implement your auth logic)
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can create domains'
            });
        }

        const { name, description, icon, color, sortOrder = 0, is_default = false } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Domain name is required'
            });
        }

        // Check if domain with same name already exists
        const existingDomain = await prisma.habitDomain.findFirst({
            where: { name }
        });

        if (existingDomain) {
            return res.status(400).json({
                success: false,
                message: 'A domain with this name already exists'
            });
        }

        // Create the domain
        const newDomain = await prisma.habitDomain.create({
            data: {
                name,
                description,
                icon: icon || '📌',
                color: color || '#607D8B',
                sortOrder: parseInt(sortOrder, 10),
                is_default
            }
        });

        return res.status(201).json({
            success: true,
            message: 'Domain created successfully',
            data: newDomain
        });
    } catch (error) {
        console.error('Error creating domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create domain',
            error: error.message
        });
    }
};

/**
 * Update a domain (admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with updated domain data or error
 */
const updateDomain = async (req, res) => {
    try {
        // Check if user is admin (implement your auth logic)
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can update domains'
            });
        }

        const { domainId } = req.params;
        const { name, description, icon, color, sortOrder, is_default } = req.body;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        // Check if domain exists
        const domain = await prisma.habitDomain.findUnique({
            where: { domain_id: parseInt(domainId, 10) }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        // If making this domain default, remove default from others
        if (is_default) {
            await prisma.habitDomain.updateMany({
                where: { is_default: true },
                data: { is_default: false }
            });
        }

        // Update the domain
        const updatedDomain = await prisma.habitDomain.update({
            where: { domain_id: parseInt(domainId, 10) },
            data: {
                name: name || domain.name,
                description: description !== undefined ? description : domain.description,
                icon: icon || domain.icon,
                color: color || domain.color,
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : domain.sortOrder,
                is_default: is_default !== undefined ? is_default : domain.is_default
            }
        });

        return res.status(200).json({
            success: true,
            message: 'Domain updated successfully',
            data: updatedDomain
        });
    } catch (error) {
        console.error('Error updating domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update domain',
            error: error.message
        });
    }
};

/**
 * Delete a domain (admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with status or error
 */
const deleteDomain = async (req, res) => {
    try {
        // Check if user is admin (implement your auth logic)
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can delete domains'
            });
        }

        const { domainId } = req.params;

        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'Domain ID is required'
            });
        }

        // Check if domain exists
        const domain = await prisma.habitDomain.findUnique({
            where: { domain_id: parseInt(domainId, 10) }
        });

        if (!domain) {
            return res.status(404).json({
                success: false,
                message: 'Domain not found'
            });
        }

        // Check if any habits are using this domain
        const habitsUsingDomain = await prisma.habit.count({
            where: { domain_id: parseInt(domainId, 10) }
        });

        if (habitsUsingDomain > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete domain. It is being used by ${habitsUsingDomain} habits.`
            });
        }

        // Delete the domain
        await prisma.habitDomain.delete({
            where: { domain_id: parseInt(domainId, 10) }
        });

        return res.status(200).json({
            success: true,
            message: 'Domain deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting domain:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete domain',
            error: error.message
        });
    }
};

/**
 * Reorder domains (admin only)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with updated domains or error
 */
const reorderDomains = async (req, res) => {
    try {
        // Check if user is admin (implement your auth logic)
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Only administrators can reorder domains'
            });
        }

        const { domainOrder } = req.body;

        if (!domainOrder || !Array.isArray(domainOrder)) {
            return res.status(400).json({
                success: false,
                message: 'Domain order array is required'
            });
        }

        // Update each domain's sort order
        const updatePromises = domainOrder.map((item, index) => {
            return prisma.habitDomain.update({
                where: { domain_id: parseInt(item.domain_id, 10) },
                data: { sortOrder: index }
            });
        });

        await Promise.all(updatePromises);

        // Get the updated domains
        const updatedDomains = await prisma.habitDomain.findMany({
            orderBy: { sortOrder: 'asc' }
        });

        return res.status(200).json({
            success: true,
            message: 'Domains reordered successfully',
            data: updatedDomains
        });
    } catch (error) {
        console.error('Error reordering domains:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reorder domains',
            error: error.message
        });
    }
};

/**
 * Get domain statistics
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Response with domain stats or error
 */
const getDomainStats = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Get all domains
        const domains = await prisma.habitDomain.findMany({
            orderBy: { sortOrder: 'asc' }
        });

        // For each domain, get number of habits and completion stats
        const domainStats = await Promise.all(domains.map(async (domain) => {
            // Count habits in this domain
            const habitCount = await prisma.habit.count({
                where: {
                    domain_id: domain.domain_id,
                    user_id: userId
                }
            });

            // If no habits, return early with zeros
            if (habitCount === 0) {
                return {
                    ...domain,
                    habitCount: 0,
                    completedToday: 0,
                    completionRate: 0
                };
            }

            // Get habit IDs for this domain
            const habits = await prisma.habit.findMany({
                where: {
                    domain_id: domain.domain_id,
                    user_id: userId
                },
                select: { habit_id: true }
            });

            const habitIds = habits.map(h => h.habit_id);

            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Count completed habits today
            const completedToday = await prisma.habitLog.count({
                where: {
                    habit_id: { in: habitIds },
                    user_id: userId,
                    completed: true,
                    completed_at: {
                        gte: today,
                        lt: tomorrow
                    }
                },
                distinct: ['habit_id']
            });

            // Get 30-day completion rate
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const totalPossibleCompletions = habitCount * 30; // Simplified; ideally check frequency

            const totalCompletions = await prisma.habitLog.count({
                where: {
                    habit_id: { in: habitIds },
                    user_id: userId,
                    completed: true,
                    completed_at: {
                        gte: thirtyDaysAgo,
                        lt: tomorrow
                    }
                }
            });

            const completionRate = totalPossibleCompletions > 0
                ? (totalCompletions / totalPossibleCompletions) * 100
                : 0;

            return {
                ...domain,
                habitCount,
                completedToday,
                completionRate: Math.round(completionRate)
            };
        }));

        return res.status(200).json({
            success: true,
            data: domainStats
        });
    } catch (error) {
        console.error('Error getting domain stats:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve domain statistics',
            error: error.message
        });
    }
};

module.exports = {
    getAllDomains,
    getDomainById,
    createDomain,
    updateDomain,
    deleteDomain,
    reorderDomains,
    getDomainStats
};