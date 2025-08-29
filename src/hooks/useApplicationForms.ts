
import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/utils';

export interface FormSection {
  name: string;
  fields: Array<any>;
  meta?: {
    action?: string;
    [key: string]: any;
  };
}

export interface ApplicationForm {
  id?: number;
  name: string;
  description?: string;
  sections?: { [x: string]: FormSection };
  meta?: { [x: string]: any };
  createdAt?: string;
  updatedAt?: string;
}

export const useApplicationForms = () => {
  const [forms, setForms] = useState<ApplicationForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/application-forms');
      if (response.ok) {
        const data: ApplicationForm[] = await response.json();
        setForms(data);
      } else {
        throw new Error('Failed to fetch application forms');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (formData: { name: string; description?: string; sections?: { [x: string]: FormSection }; meta?: { [x: string]: any } }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('/application-form', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const newForm: ApplicationForm = await response.json();
        setForms(prev => [...prev, newForm]);
        return newForm;
      } else {
        throw new Error('Failed to create application form');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateForm = async (id: number, formData: Partial<ApplicationForm>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/application-form/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const updatedForm: ApplicationForm = await response.json();
        setForms(prev => prev.map(form => form.id === id ? updatedForm : form));
        return updatedForm;
      } else {
        throw new Error('Failed to update application form');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/application-form/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setForms(prev => prev.filter(form => form.id !== id));
      } else {
        throw new Error('Failed to delete application form');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getForm = useCallback(async (id: number): Promise<ApplicationForm | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(`/application-form/${id}`);
      if (response.ok) {
        const form: ApplicationForm = await response.json();
        return form;
      } else {
        throw new Error('Failed to fetch application form');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, []);

  return {
    forms,
    loading,
    error,
    fetchForms,
    createForm,
    updateForm,
    deleteForm,
    getForm,
  };
};
