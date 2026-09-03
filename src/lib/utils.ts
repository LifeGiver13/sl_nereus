import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { API_BASE_URL } from '../config/env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function for authenticated API requests
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('session_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['x-service-user'] = token;
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// Utility function to get nested object properties using dot notation
export function getNestedProperty(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Utility function to set nested object properties using dot notation
export function setNestedProperty(obj: any, path: string, value: any): any {
  if (!obj || !path) return obj;

  const keys = path.split('.');
  const lastKey = keys.pop();

  if (!lastKey) return obj;

  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);

  target[lastKey] = value;
  return obj;
}


export const viewPathToFormPath = (viewPath: string): string => {
  if (viewPath.startsWith('address.')) return `profile.${viewPath}`;
  if (viewPath.startsWith('contact.')) return `profile.contact.${viewPath.replace('contact.', '')}`;
  return viewPath;
};

export const getValueByViewPath = (formData: any, viewPath: string): any => {
  const formPath = viewPathToFormPath(viewPath);
  const keys = formPath.split('.');
  let current = formData;
  for (const key of keys) {
    current = current?.[key];
    if (current === undefined || current === null) return '';
  }
  return current;
};

export const setValueByViewPath = (obj: any, viewPath: string, value: any): any => {
  const formPath = viewPathToFormPath(viewPath);
  const keys = formPath.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
};