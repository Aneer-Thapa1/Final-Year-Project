import { fetchData, postData, updateData, deleteData, uploadImage } from './api';

// Blog interfaces
export interface Blog {
    blog_id?: number;
    title: string;
    content: string;
    image?: string;
    category_id: number;
    user_id?: number;
    is_featured?: boolean;
    view_count?: number;
    createdAt?: string;
    updatedAt?: string;
    user?: User;
    category?: Category;
    likesCount?: number;
    commentsCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
}

export interface User {
    user_id: number;
    user_name: string;
    avatar?: string;
}

export interface Category {
    category_id: number;
    category_name: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
}

export interface Comment {
    comment_id: number;
    content: string;
    user_id: number;
    blog_id: number;
    parent_id?: number;
    createdAt: string;
    updatedAt: string;
    user?: User;
    replies?: Comment[];
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Function to add a new blog with category support
export const addBlog = async (blogData) => {
    try {
        // Create a new FormData instance
        const formData = new FormData();

        // Add text fields to FormData
        if (blogData.title) formData.append('title', blogData.title);
        formData.append('content', blogData.content);
        formData.append('category_id', blogData.category_id.toString());

        if (blogData.is_featured !== undefined) {
            formData.append('is_featured', blogData.is_featured.toString());
        }



        // Add image if it exists
        if (blogData.image) {
            // Get the file extension
            const uriParts = blogData.image.split('.');
            const fileType = uriParts[uriParts.length - 1];

            // Create file object with the correct format for React Native
            const imageFile = {
                uri: blogData.image,
                name: `photo.${fileType}`,
                type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
            };

            console.log('Appending image:', imageFile);
            formData.append('image', imageFile);
        }

        // Use the postFormData function to send multipart/form-data
        return await postData('/api/blog/addBlog', formData);
    } catch (error) {
        console.error('Error in addBlog:', error);
        throw error.response?.data?.error || error.message || 'Failed to add blog';
    }
};

// Function to get blogs for the feed (with pagination)
export const getBlogs = async (lastLoadedBlogId?: number, limit: number = 10) => {
    try {
        let url = '/api/blog/getBlogs';

        // Add query parameters if provided
        if (lastLoadedBlogId) {
            url += `?lastLoadedBlogId=${lastLoadedBlogId}&limit=${limit}`;
        } else {
            url += `?limit=${limit}`;
        }

        const response = await fetchData<ApiResponse<Blog[]>>(url);

        // Process response
        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getBlogs:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getBlogs:', error);
        throw error.response?.data?.error || 'Failed to fetch blogs';
    }
};

// Function to get blogs created by the authenticated user
export const getUserBlogs = async () => {
    try {
        const response = await fetchData<ApiResponse<Blog[]>>('/api/blog/getUserBlogs');

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getUserBlogs:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getUserBlogs:', error);
        throw error.response?.data?.error || 'Failed to fetch your blogs';
    }
};

// Function to edit an existing blog
export const editBlog = async (blogId: number, blogData: Partial<Blog>) => {
    try {
        return await updateData<ApiResponse<Blog>>(`/api/blog/editBlog/${blogId}`, blogData);
    } catch (error: any) {
        console.error('Error in editBlog:', error);
        throw error.response?.data?.error || 'Failed to update blog';
    }
};

// Function to delete a blog
export const deleteBlog = async (blogId: number) => {
    try {
        return await deleteData<ApiResponse<void>>(`/api/blog/deleteBlog/${blogId}`);
    } catch (error: any) {
        console.error('Error in deleteBlog:', error);
        throw error.response?.data?.error || 'Failed to delete blog';
    }
};

// Function to like/unlike a blog
export const toggleLikeBlog = async (blogId: number) => {
    try {
        return await postData<ApiResponse<{liked: boolean}>>(`/api/blog/toggleLike/${blogId}`, {});
    } catch (error: any) {
        console.error('Error in toggleLikeBlog:', error);
        throw error.response?.data?.error || 'Failed to like/unlike blog';
    }
};

// Function to get blog details with comments
export const getBlogDetails = async (blogId: number) => {
    try {
        return await fetchData<ApiResponse<Blog>>(`/api/blog/getBlogDetails/${blogId}`);
    } catch (error: any) {
        console.error('Error in getBlogDetails:', error);
        throw error.response?.data?.error || 'Failed to fetch blog details';
    }
};

// Function to get trending blogs
export const getTrendingBlogs = async (limit: number = 5) => {
    try {
        return await fetchData<ApiResponse<Blog[]>>(`/api/blog/trending?limit=${limit}`);
    } catch (error: any) {
        console.error('Error in getTrendingBlogs:', error);
        throw error.response?.data?.error || 'Failed to fetch trending blogs';
    }
};

// Function to get categories
export const getCategories = async () => {
    try {
        const response = await fetchData<ApiResponse<Category[]>>('/api/blog/categories');

        if (response && response.success && response.data) {
            return response;
        } else {
            console.warn('Unexpected API response format in getCategories:', response);
            return { success: true, data: [] };
        }
    } catch (error: any) {
        console.error('Error in getCategories:', error);
        throw error.response?.data?.error || 'Failed to fetch categories';
    }
};

// Create a custom hook for categories (for React components)
export const useCategories = () => {
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const response = await getCategories();
                if (response.success && response.data) {
                    setCategories(response.data);
                }
            } catch (err: any) {
                setError(err.message || 'Failed to fetch categories');
                console.error('Error fetching categories:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return { categories, loading, error };
};

