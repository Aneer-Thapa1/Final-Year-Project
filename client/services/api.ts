    import axios from 'axios';
    import AsyncStorage from '@react-native-async-storage/async-storage';

    export const API_BASE_URL = 'https://140c-2400-74e0-10-31cd-71bc-5d78-73d7-9fd7.ngrok-free.app';

    // Set up a basic configuration for making API requests
    const api = axios.create({
        baseURL: API_BASE_URL, // The main URL of API
        headers: {
            'Content-Type': 'application/json', // Tell the server we're sending JSON data
        },
    });

    // Before sending a request, add the user's token if they are logged in
    api.interceptors.request.use(async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Don't override Content-Type if it's already set (important for FormData)
        if (!config.headers['Content-Type'] && !config.data instanceof FormData) {
            config.headers['Content-Type'] = 'application/json';
        }

        return config;
    }, (error) => {
        return Promise.reject(error);
    });

    // After receiving a response, check for errors and handle them
    api.interceptors.response.use( async (response) => response, // If the response is good, just return it
        (error) => {
            if (error.response) {
                // Handle different types of errors based on the status code
                switch (error.response.status) {
                    case 401:
                        // If the user is not authorized, log them out or redirect to login
                        console.error('You are not authorized. Please log in.');
                        break;
                    case 404:
                        // If the resource is not found, show a message
                        console.error('The resource you are looking for does not exist.');
                        break;
                    case 500:
                        // If there's a server error, let the user know
                        console.error('Something went wrong on the server. Please try again later.');
                        break;
                    case 422:
                        // Handle validation errors
                        console.error('Validation failed:', error.response.data);
                        break;
                    default:
                        // For any other error, show a generic message
                        console.error('An error occurred:', error.message);
                }
            } else {
                // If there's no response, it might be a network issue
                console.error('There was a network error. Please check your connection.');
            }
            return Promise.reject(error); // Pass the error along
        });

    // Function to fetch data from the API
    export const fetchData = async (endpoint: string) => {
        try {
            const response = await api.get(endpoint); // Send a GET request to the endpoint
            return response.data; // Return the data from the response
        } catch (error) {
            console.error('Error fetching data:', error); // If something goes wrong, log the error
            throw error; // Re-throw the error so it can be handled elsewhere
        }
    };

    // Function to send data to the API
    export const postImageData = async (endpoint, formData) => {
        try {
            // Create custom config for formData
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            // Make the request with formData
            const response = await api.post(endpoint, formData, config);
            return response.data;
        } catch (error) {
            console.error('Error posting form data:', error);
            throw error;
        }
    };


    export const postData = async (endpoint, data) => {
        try {
            // Create config for JSON data
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // Make the request with JSON data
            const response = await api.post(endpoint, data, config);
            return response.data;
        } catch (error) {
            console.error('Error posting data:', error);
            throw error;
        }
    };
    // Function to update data on the API
    export const updateData = async (endpoint: string, data: any) => {
        try {
            const response = await api.put(endpoint, data); // Send a PUT request to update data
            return response.data; // Return the data from the response
        } catch (error) {
            console.error('Error updating data:', error); // If something goes wrong, log the error
            throw error; // Re-throw the error so it can be handled elsewhere
        }
    };

    // Function to delete data from the API
    export const deleteData = async (endpoint: string) => {
        try {
            const response = await api.delete(endpoint); // Send a DELETE request
            return response.data; // Return the data from the response
        } catch (error) {
            console.error('Error deleting data:', error); // If something goes wrong, log the error
            throw error; // Re-throw the error so it can be handled elsewhere
        }
    };

    // Add to api.js
    export const uploadImage = async (imageUri) => {
        try {
            // Create form data for file upload
            const formData = new FormData();

            // Get the file name from the URI
            const uriParts = imageUri.split('/');
            const fileName = uriParts[uriParts.length - 1];

            // Append the file to form data
            formData.append('image', {
                uri: imageUri,
                name: fileName,
                type: 'image/jpeg', // You might need to detect this based on the image
            });

            // Special headers for form data
            const uploadHeaders = {
                'Content-Type': 'multipart/form-data',
            };

            // Upload the image
            const response = await api.post('/api/upload/image', formData, {
                headers: uploadHeaders,
            });

            // Return the URL or ID of the uploaded image
            return response.data.imageUrl || response.data.image;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    export default api; // Export the configured API instance
    export { API_BASE_URL };