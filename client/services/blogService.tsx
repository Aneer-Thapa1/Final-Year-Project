import {fetchData, postData, updateData} from './api';

export const addBlog = async (blogData: {
    blogTitle: string, blogDescription: string, blogImage: string;
}) => {
    try{
        return await postData('/addBlog', blogData); // Used the `postData` utility from userService
    }catch (error: any) {
        throw error.response?.data?.message || 'Adding new blog failed';
    }
}