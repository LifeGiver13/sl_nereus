import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Department, DepartmentResponse } from '../types/job';

export const useDepartments = () => {
  const { data: departmentsResponse, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiRequest('/utils/department-list');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      console.log('Departments API response:', data); // Debug log
      return data as DepartmentResponse;
    }
  });

  // Transform object response to array of Department objects
  const departments: Department[] = departmentsResponse 
    ? Object.entries(departmentsResponse).map(([id, name]) => ({
        id: parseInt(id),
        name
      }))
    : [];

  const getDepartmentName = (departmentId: number): string => {
    if (!departmentsResponse) {
      return 'Loading...';
    }
    
    return departmentsResponse[departmentId.toString()] || 'Unknown Department';
  };

  return {
    departments,
    isLoading,
    getDepartmentName
  };
};