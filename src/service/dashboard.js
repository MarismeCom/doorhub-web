import { httpRequest } from './http';

export const dashboardService = {
    summary() {
        return httpRequest('/dashboard/summary');
    }
};
