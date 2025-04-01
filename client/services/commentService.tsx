import { fetchData, postData, updateData, deleteData } from './api';

// Interface for comment data
export interface Comment {
    comment_id: number;
    user_id: number;
    blog_id: number;
    content: string;
    parent_id?: number;
    createdAt: string;
    updatedAt: string;
    user?: {
        user_id: number;
        user_name: string;
        avatar?: string;
    };
    replies?: Comment[];
}

// Interface for adding a comment
export interface AddCommentPayload {
    content: string;
    parent_id?: number;
}

// Interface for updating a comment
export interface UpdateCommentPayload {
    content: string;
}

// Function to get all comments for a blog
export const getComments = async (blogId: number) => {
    try {
        const response = await fetchData(`/api/comments/${blogId}`);

        // Check if response is valid and has data
        if (response && response.data) {
            return response;
        } else if (Array.isArray(response)) {
            return { success: true, data: response }; // If response itself is the array
        } else {
            console.warn('Unexpected API response format in getComments:', response);
            return { success: true, data: [] }; // Return empty array as fallback
        }
    } catch (error: any) {
        console.error('Error in getComments:', error);
        throw error.response?.data?.message || 'Failed to fetch comments';
    }
};

// Function to add a comment to a blog
export const addComment = async (blogId: number, commentData: AddCommentPayload) => {
    try {
        return await postData(`/api/comments/addComment/${blogId}`, commentData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to add comment';
    }
};

// Function to update a comment
export const updateComment = async (commentId: number, commentData: UpdateCommentPayload) => {
    try {
        return await updateData(`/api/comments/${commentId}`, commentData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update comment';
    }
};

// Function to delete a comment
export const deleteComment = async (commentId: number) => {
    try {
        return await deleteData(`/api/comments/${commentId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to delete comment';
    }
};

// Function to toggle like on a blog
export const toggleLike = async (blogId: number) => {
    try {
        return await postData(`/api/comments/toggleLike/${blogId}`, {});
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to toggle like';
    }
};

// Function to get replies for a comment
export const getCommentReplies = async (commentId: number) => {
    try {
        return await fetchData(`/api/comments/${commentId}/replies`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch comment replies';
    }
};

// Function to check if user has liked a blog
export const checkBlogLikeStatus = async (blogId: number) => {
    try {
        return await fetchData(`/api/comments/checkLiked/${blogId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to check like status';
    }
};

// Function to get like count for a blog
export const getBlogLikeCount = async (blogId: number) => {
    try {
        return await fetchData(`/api/comments/likeCount/${blogId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch like count';
    }
};

export default {
    getComments,
    addComment,
    updateComment,
    deleteComment,
    toggleLike,
    getCommentReplies,
    checkBlogLikeStatus,
    getBlogLikeCount
};