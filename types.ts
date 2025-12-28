
export type ViewState = 'dashboard' | 'kuwait' | 'saudi' | 'jordan' | 'oman' | 'uae' | 'qatar' | 'bahrain' | 'all' | 'help' | 'contact' | 'profile' | 'settings' | 'admin';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  name: string;
  agencyName: string;
  phone: string;
  role: 'admin' | 'user';
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionExpiry?: string;
  joinedDate: string;
  cvGeneratedCount: number;
  personalApiKey?: string;
}

export interface AppSettings {
  enabledCountries: {
    kuwait: boolean;
    saudi: boolean;
    jordan: boolean;
    oman: boolean;
    uae: boolean;
    qatar: boolean;
    bahrain: boolean;
  };
}

export type FieldType = 'text' | 'image' | 'checkmark' | 'boolean';
export type FieldCategory = 'personal' | 'passport' | 'experience' | 'skills' | 'contact' | 'custom';

export interface TemplateField {
  id: string;
  key: string;
  label: string;
  customLabel?: string; // For renaming custom fields
  dateFormat?: 'numeric' | 'alpha'; // For date formatting options
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  type: FieldType;
  category: FieldCategory;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
}

export interface CustomTemplate {
  id: string;
  name: string;
  officeName: string;
  country: string;
  pages: string[]; 
  fields: TemplateField[];
  createdAt: string;
}

export interface BaseFormData {
  [key: string]: any; 
  photos: {
    face: string | null;
    full: string | null;
    passport: string | null;
  };
}
