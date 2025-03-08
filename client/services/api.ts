import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set up a basic configuration for making API requests
const api = axios.create({
    baseURL: 'https://23df-2400-74e0-10-31cd-3949-6835-45bb-d9a8.ngrok-free.app', // The main URL of API
    headers: {
        'Content-Type': 'application/json', // Tell the server we're sending JSON data
    },
});

// Before sending a request, add the user's token if they are logged in
api.interceptors.request.use( async (config) => {
    const token = await AsyncStorage.getItem('token'); // Get the token from Async storage
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Add the token to the request
    }
    return config;
}, (error) => {
    return Promise.reject(error); // If something goes wrong, stop and show the error
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
export const postData = async (endpoint: string, data: any) => {
    try {
        const response = await api.post(endpoint, data); // Send a POST request with data
        return response.data; // Return the data from the response
    } catch (error) {
        console.error('Error posting data:', error); // If something goes wrong, log the error
        throw error; // Re-throw the error so it can be handled elsewhere
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

export default api; // Export the configured API instance