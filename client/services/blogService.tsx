import { fetchData, postData, updateData, deleteData } from './api';

// Blog interfaces
export interface Blog {
    blog_id?: number;
    blog_title: string;
    blog_description: string;
    blog_image?: string;
    category_id: number; // Added category_id field
    user_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface BlogResponse {
    success: boolean;
    data?: Blog[] | Blog;
    message?: string;
    error?: string;
}

// Function to add a new blog with category support
export const addBlog = async (blogData: {
    blog_title: string;
    blog_description: string;
    blog_image?: string;
    category_id: number; // Added category_id parameter
}) => {
    try {
        // Validate category_id is present
        if (!blogData.category_id) {
            throw new Error('Category ID is required');
        }

        return await postData('/api/blog/addBlog', blogData);
    } catch (error: any) {
        console.error('Error in addBlog:', error);
        throw error.response?.data?.message || error.message || 'Failed to add blog';
    }
};

// Function to get blogs for the feed (with pagination)
export const getBlogs = async (lastLoadedBlogId?: number, limit: number = 7) => {
    try {
        let url = '/api/blog/getBlogs';

        // Add query parameters if provided
        if (lastLoadedBlogId) {
            url += `?lastLoadedBlogId=${lastLoadedBlogId}&limit=${limit}`;
        } else {
            url += `?limit=${limit}`;
        }

        const response = await fetchData(url);

        // Check if response is valid and has data
        if (response && response.data) {
            return response.data; // If response has a data property
        } else if (Array.isArray(response)) {
            return response; // If response itself is the array
        } else {
            console.warn('Unexpected API response format in getBlogs:', response);
            return []; // Return empty array as fallback
        }
    } catch (error: any) {
        console.error('Error in getBlogs:', error);
        throw error.response?.data?.message || 'Failed to fetch blogs';
    }
};

// Function to get blogs by category
export const getBlogsByCategory = async (categoryId: number, lastLoadedBlogId?: number, limit: number = 7) => {
    try {
        let url = `/api/blog/getBlogsByCategory/${categoryId}`;

        // Add query parameters if provided
        if (lastLoadedBlogId) {
            url += `?lastLoadedBlogId=${lastLoadedBlogId}&limit=${limit}`;
        } else {
            url += `?limit=${limit}`;
        }

        const response = await fetchData(url);

        // Check if response is valid and has data
        if (response && response.data) {
            return response.data;
        } else if (Array.isArray(response)) {
            return response;
        } else {
            console.warn('Unexpected API response format in getBlogsByCategory:', response);
            return [];
        }
    } catch (error: any) {
        console.error('Error in getBlogsByCategory:', error);
        throw error.response?.data?.message || 'Failed to fetch blogs by category';
    }
};

// Function to get blogs created by the authenticated user
export const getUserBlogs = async () => {
    try {
        const response = await fetchData('/api/blog/getUserBlogs');

        // Check if response is valid and has data
        if (response && response.data) {
            return response.data;
        } else if (Array.isArray(response)) {
            return response;
        } else {
            console.warn('Unexpected API response format in getUserBlogs:', response);
            return [];
        }
    } catch (error: any) {
        console.error('Error in getUserBlogs:', error);
        throw error.response?.data?.message || 'Failed to fetch your blogs';
    }
};

// Function to edit an existing blog
export const editBlog = async (blogId: number, blogData: Partial<Blog>) => {
    try {
        return await updateData(`/api/blog/editBlog/${blogId}`, blogData);
    } catch (error: any) {
        console.error('Error in editBlog:', error);
        throw error.response?.data?.message || 'Failed to update blog';
    }
};

// Function to delete a blog
export const deleteBlog = async (blogId: number) => {
    try {
        return await deleteData(`/api/blog/deleteBlog/${blogId}`);
    } catch (error: any) {
        console.error('Error in deleteBlog:', error);
        throw error.response?.data?.message || 'Failed to delete blog';
    }
};

// Function to like/unlike a blog (for future implementation)
export const toggleLikeBlog = async (blogId: number) => {
    try {
        return await postData(`/api/blog/toggleLike/${blogId}`, {});
    } catch (error: any) {
        console.error('Error in toggleLikeBlog:', error);
        throw error.response?.data?.message || 'Failed to like/unlike blog';
    }
};

// Function to add a comment to a blog (for future implementation)
export const addComment = async (blogId: number, comment: string) => {
    try {
        return await postData(`/api/blog/addComment/${blogId}`, { comment });
    } catch (error: any) {
        console.error('Error in addComment:', error);
        throw error.response?.data?.message || 'Failed to add comment';
    }
};

// Function to get a single blog with details
export const getSingleBlog = async (blogId: number) => {
    try {
        return await fetchData(`/api/blog/getSingleBlog/${blogId}`);
    } catch (error: any) {
        console.error('Error in getSingleBlog:', error);
        throw error.response?.data?.message || 'Failed to fetch blog details';
    }
};