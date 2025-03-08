import { fetchData, postData, updateData } from './api';

// Interface for domain data
export interface Domain {
    domain_id: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    is_default?: boolean;
}

// Function to get all domains
export const getDomains = async () => {
    try {
        const response = await fetchData('/api/domain/getAllDomains');

        // Check if response is valid and has data
        if (response && response.data) {
            return response.data;
        } else if (Array.isArray(response)) {
            return response; // If response itself is the array
        } else {
            console.warn('Unexpected API response format in getDomains:', response);
            return []; // Return empty array as fallback
        }
    } catch (error: any) {
        console.error('Error in getDomains:', error);
        throw error.response?.data?.message || 'Failed to fetch domains';
    }
};

// Function to get a single domain
export const getDomainById = async (domainId: number) => {
    try {
        return await fetchData(`/api/domain/getDomainById/${domainId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch domain details';
    }
};

// Function to get domain statistics (for admins or users)
export const getDomainStats = async () => {
    try {
        return await fetchData('/api/domain/getDomainStats');
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch domain statistics';
    }
};

// Function to create a new domain (admin only)
export const createDomain = async (domainData: Omit<Domain, 'domain_id'>) => {
    try {
        return await postData('/api/domain/createDomain', domainData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to create domain';
    }
};

// Function to update a domain (admin only)
export const updateDomain = async (domainId: number, domainData: Partial<Domain>) => {
    try {
        return await updateData(`/api/domain/updateDomain/${domainId}`, domainData);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to update domain';
    }
};

// Function to delete a domain (admin only)
export const deleteDomain = async (domainId: number) => {
    try {
        return await fetchData(`/api/domain/deleteDomain/${domainId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to delete domain';
    }
};

// Function to reorder domains (admin only)
export const reorderDomains = async (domainOrder: Array<{domain_id: number}>) => {
    try {
        return await postData('/api/domain/reorderDomains', { domainOrder });
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to reorder domains';
    }
};

// Function to get habits by domain
export const getHabitsByDomain = async (domainId: number) => {
    try {
        return await fetchData(`/api/habit/getHabitsByDomain/${domainId}`);
    } catch (error: any) {
        throw error.response?.data?.message || 'Failed to fetch habits by domain';
    }
};