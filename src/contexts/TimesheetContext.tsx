import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import { API_BASE_URL } from "../config/env";
import { useAuth } from "./AuthContext";

export interface TimesheetCustomField {
  id: number;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

interface CreateCustomFieldPayload {
  fieldName: string;
  fieldType: string;
  isRequired?: boolean;
  displayOrder?: number;
}

interface TimesheetCustomFieldsContextType {
  customFields: TimesheetCustomField[];
  loading: boolean;
  fetchCustomFields: () => Promise<void>;
  createCustomField: (
    payload: CreateCustomFieldPayload | CreateCustomFieldPayload[]
  ) => Promise<void>;
  updateCustomField: (
    id: number,
    payload: Partial<CreateCustomFieldPayload>
  ) => Promise<void>;
  deleteCustomField: (id: number) => Promise<void>;
}

const TimesheetCustomFieldsContext =
  createContext<TimesheetCustomFieldsContextType | undefined>(undefined);

export const useTimesheetCustomFields = () => {
  const context = useContext(TimesheetCustomFieldsContext);

  if (!context) {
    throw new Error(
      "useTimesheetCustomFields must be used within TimesheetCustomFieldsProvider"
    );
  }

  return context;
};

export const TimesheetCustomFieldsProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { token } = useAuth();

  const [customFields, setCustomFields] = useState<TimesheetCustomField[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    "X-SERVICE-USER": token ?? "",
  });

  const fetchCustomFields = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/custom-feilds`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch custom fields");
      }

      const data = await response.json();
      setCustomFields(data);
    } catch (error) {
      console.error("[fetchCustomFields]", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createCustomField = async (
    payload: CreateCustomFieldPayload | CreateCustomFieldPayload[]
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/custom-feild`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create custom field");
      }

      await fetchCustomFields();
    } catch (error) {
      console.error("[createCustomField]", error);
      throw error;
    }
  };

  const updateCustomField = async (
    id: number,
    payload: Partial<CreateCustomFieldPayload>
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/custom-feild/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update custom field");
      }

      await fetchCustomFields();
    } catch (error) {
      console.error("[updateCustomField]", error);
      throw error;
    }
  };

  const deleteCustomField = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/custom-feild/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete custom field");
      }

      setCustomFields((prev) => prev.filter((field) => field.id !== id));
    } catch (error) {
      console.error("[deleteCustomField]", error);
      throw error;
    }
  };

  return (
    <TimesheetCustomFieldsContext.Provider
      value={{
        customFields,
        loading,
        fetchCustomFields,
        createCustomField,
        updateCustomField,
        deleteCustomField,
      }}
    >
      {children}
    </TimesheetCustomFieldsContext.Provider>
  );
};