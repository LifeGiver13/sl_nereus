import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/utils';
import { Department } from '../types/job';

export const useDepartments = () => {
  const { data: departmentsData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await apiRequest('/utils/department-list');
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      console.log('Departments API response:', data); // Debug log
      return data;
    }
  });

  // Ensure departments is always an array
  const departments = Array.isArray(departmentsData) ? departmentsData : [];

  const getDepartmentName = (departmentId: number): string => {
    // Ensure departments is an array before using find
    if (!Array.isArray(departments) || departments.length === 0) {
      return 'Loading...';
    }
    
    const department = departments.find((dept: Department) => dept.id === departmentId);
    return department?.name || 'Unknown Department';
  };

  return {
    departments,
    isLoading,
    getDepartmentName
  };
};