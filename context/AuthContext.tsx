
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AppSettings, CustomTemplate } from '../types';
import { supabase } from '../services/supabaseClient';

interface ApiKey {
  id: string;
  key_value: string;
  is_active: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  settings: AppSettings;
  templates: CustomTemplate[];
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  trackGeneration: (amount?: number) => void;
  saveSettings: (s: AppSettings) => void;
  saveTemplate: (t: CustomTemplate, pageAssets: (string | File)[]) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  addSubscription: (userId: string, type: 'month' | 'year' | '15days') => Promise<void>;
  terminateUser: (userId: string) => Promise<void>;
  promoteSelf: () => Promise<void>;
  getApiKeys: () => Promise<ApiKey[]>;
  addApiKey: (key: string) => Promise<void>;
  toggleApiKey: (id: string, active: boolean) => Promise<void>;
  deleteApiKey: (id: string) => Promise<void>;
  cycleApiKey: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SUPER_ADMIN_EMAIL = "nathanasrat262@gmail.com";
const DEFAULT_SETTINGS: AppSettings = { enabledCountries: { kuwait: true, saudi: true, jordan: true, oman: true, uae: true, qatar: true, bahrain: true } };

const DEMO_USER: User = {
  id: 'demo-agency-001',
  email: 'demo@pixelcv.agency',
  name: 'Agency Representative',
  agencyName: 'Pixel Global Recruitment',
  phone: '+251 91 123 4567',
  role: 'admin',
  subscriptionStatus: 'active',
  subscriptionPlan: 'yearly',
  subscriptionExpiry: '2029-12-31T23:59:59.000Z',
  joinedDate: '2026-01-01T00:00:00.000Z',
  cvGeneratedCount: 12
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('pixel_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.enabledCountries) {
          return {
            enabledCountries: {
              ...DEFAULT_SETTINGS.enabledCountries,
              ...parsed.enabledCountries
            }
          };
        }
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);

  const loadUserSettings = async (userId: string) => {
    try {
      let loadedSettings: AppSettings | null = null;
      // 1. Try Supabase Auth user metadata
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.user_metadata?.app_settings) {
          loadedSettings = authData.user.user_metadata.app_settings;
        }
      } catch (err) {
        console.warn("Could not retrieve cloud user_metadata settings:", err);
      }

      // 2. Try user-specific localStorage key
      if (!loadedSettings) {
        const userSaved = localStorage.getItem(`pixel_settings_${userId}`);
        if (userSaved) {
          try { loadedSettings = JSON.parse(userSaved); } catch {}
        }
      }

      // 3. Fallback to global pixel_settings
      if (!loadedSettings) {
        const globalSaved = localStorage.getItem('pixel_settings');
        if (globalSaved) {
          try { loadedSettings = JSON.parse(globalSaved); } catch {}
        }
      }

      if (loadedSettings && loadedSettings.enabledCountries) {
        const merged: AppSettings = {
          enabledCountries: {
            ...DEFAULT_SETTINGS.enabledCountries,
            ...loadedSettings.enabledCountries
          }
        };
        setSettings(merged);
        localStorage.setItem('pixel_settings', JSON.stringify(merged));
        localStorage.setItem(`pixel_settings_${userId}`, JSON.stringify(merged));
      }
    } catch (err) {
      console.warn("Error loading user settings:", err);
    }
  };

  const cycleApiKey = async (providedKey?: string) => {
    // Determine the key to use (Priority: Passed key > User profile key > Vault key)
    let targetKey = providedKey || user?.personalApiKey;

    if (!targetKey) {
      try {
        const { data: keys } = await supabase
          .from('api_vault')
          .select('key_value')
          .eq('is_active', true);
        
        if (keys && keys.length > 0) {
          const randomIndex = Math.floor(Math.random() * keys.length);
          targetKey = keys[randomIndex].key_value;
        }
      } catch (e) {
        console.error("[API Vault] Key rotation failure:", e);
      }
    }

    // Apply the key to the global environment where the Gemini SDK expects it
    if (targetKey) {
      if ((window as any).process?.env) {
        (window as any).process.env.API_KEY = targetKey;
      }
      if ((globalThis as any).process?.env) {
        (globalThis as any).process.env.API_KEY = targetKey;
      }
    }
  };

  const fetchUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data && !error) {
        if (data.email === SUPER_ADMIN_EMAIL && data.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          data.role = 'admin';
        }

        // Apply personal API key to global context immediately
        if (data.personal_api_key) {
          await cycleApiKey(data.personal_api_key);
        } else {
          await cycleApiKey();
        }

        setUser({
          id: data.id, email: data.email, name: data.name, agencyName: data.agency_name,
          phone: data.phone, role: data.role, subscriptionStatus: data.subscription_status,
          subscriptionPlan: data.subscription_plan, subscriptionExpiry: data.subscription_expiry,
          joinedDate: data.created_at, cvGeneratedCount: data.cv_generated_count || 0,
          personalApiKey: data.personal_api_key
        });

        // Load and sync user's deployment targets settings
        loadUserSettings(data.id);
      }
    } catch (e) { 
      console.error("Error fetching user:", e); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const fetchTemplates = async (userId: string) => {
    try {
      const { data } = await supabase.from('templates').select('*').eq('owner_id', userId);
      if (data) {
        setTemplates(data.map((t: any) => ({
          id: t.id, name: t.name, officeName: t.office_name || t.name,
          country: t.country, pages: t.pages || [], fields: t.fields, createdAt: t.created_at
        })));
      }
    } catch (e) { console.error("Error fetching templates:", e); }
  };

  useEffect(() => {
    if (localStorage.getItem('pixel_demo_user') === 'true') {
      setUser(DEMO_USER);
      setIsLoading(false);
      cycleApiKey();
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { 
        fetchUser(session.user.id); 
        fetchTemplates(session.user.id); 
      } else { 
        setIsLoading(false); 
        cycleApiKey();
      }
    }).catch(err => {
      console.warn("Supabase getSession failed:", err);
      setIsLoading(false);
      cycleApiKey();
    });
    
    let unsubscribeFn = () => {};
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (localStorage.getItem('pixel_demo_user') === 'true') return;
        if (session) { 
          fetchUser(session.user.id); 
          fetchTemplates(session.user.id); 
        } else { 
          setUser(null); 
          setTemplates([]); 
          setIsLoading(false); 
          cycleApiKey();
        }
      });
      if (subscription?.unsubscribe) {
        unsubscribeFn = () => subscription.unsubscribe();
      }
    } catch (err) {
      console.warn("Auth listener setup issue:", err);
    }
    return () => unsubscribeFn();
  }, []);

  const login = async (data: any) => {
    if (data.email?.toLowerCase().includes('demo') || data.isDemo) {
      setUser(DEMO_USER);
      localStorage.setItem('pixel_demo_user', 'true');
      const demoSaved = localStorage.getItem('pixel_settings_demo-agency-001') || localStorage.getItem('pixel_settings');
      if (demoSaved) {
        try {
          const parsed = JSON.parse(demoSaved);
          if (parsed?.enabledCountries) {
            setSettings({
              enabledCountries: {
                ...DEFAULT_SETTINGS.enabledCountries,
                ...parsed.enabledCountries
              }
            });
          }
        } catch {}
      }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) throw error;
  };

  const register = async (data: any) => {
    const { error } = await supabase.auth.signUp({
      email: data.email, password: data.password,
      options: { data: { name: data.name, agency_name: data.agencyName, phone: data.phone } }
    });
    if (error) throw error;
  };

  const logout = async () => { 
    localStorage.removeItem('pixel_demo_user');
    setUser(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out issue:", e);
    }
  };
  const refreshUser = () => { if (user) fetchUser(user.id); };
  
  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    if (user.id === 'demo-agency-001') {
      setUser(prev => prev ? ({ ...prev, ...data }) : null);
      return;
    }
    const { error } = await supabase.from('profiles').update({ name: data.name, agency_name: data.agencyName, phone: data.phone }).eq('id', user.id);
    if (error) throw error;
    refreshUser();
  };

  const changePassword = async (newPass: string) => {
    if (user?.id === 'demo-agency-001') return;
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
  };

  const trackGeneration = async (amount: number = 1) => {
    if (!user) return;
    const nextCount = (user.cvGeneratedCount || 0) + amount;
    if (user.id === 'demo-agency-001') {
      setUser(prev => prev ? ({ ...prev, cvGeneratedCount: nextCount }) : null);
      return;
    }
    await supabase.from('profiles').update({ cv_generated_count: nextCount }).eq('id', user.id);
    refreshUser();
  };

  const saveSettings = async (s: AppSettings) => {
    setSettings(s);
    try {
      localStorage.setItem('pixel_settings', JSON.stringify(s));
      const currentUserId = user?.id || (localStorage.getItem('pixel_demo_user') === 'true' ? 'demo-agency-001' : null);
      if (currentUserId) {
        localStorage.setItem(`pixel_settings_${currentUserId}`, JSON.stringify(s));
        if (currentUserId !== 'demo-agency-001') {
          supabase.auth.updateUser({ data: { app_settings: s } }).catch(err => {
            console.warn("Could not sync app_settings to Supabase auth metadata:", err);
          });
        }
      }
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  };

  const saveTemplate = async (t: CustomTemplate, pageAssets: (string | File)[]) => {
    if (!user) return;
    if (user.id === 'demo-agency-001') {
      const demoPages = pageAssets.map(a => typeof a === 'string' ? a : URL.createObjectURL(a));
      setTemplates(prev => [...prev.filter(item => item.id !== t.id), { ...t, pages: demoPages }]);
      return;
    }
    const uploadedPages = await Promise.all(pageAssets.map(async (asset, idx) => {
      if (typeof asset === 'string' && asset.startsWith('http')) return asset;
      const file = typeof asset === 'string' ? null : asset;
      if (!file) return asset as string;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${t.id}/${idx}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('backgrounds').upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('backgrounds').getPublicUrl(data.path);
      return publicUrl;
    }));
    const { error } = await supabase.from('templates').upsert({
      id: t.id, owner_id: user.id, name: t.name, office_name: t.officeName, country: t.country, pages: uploadedPages, fields: t.fields
    });
    if (error) throw error;
    fetchTemplates(user.id);
  };

  const deleteTemplate = async (id: string) => {
    if (user?.id === 'demo-agency-001') {
      setTemplates(prev => prev.filter(t => t.id !== id));
      return;
    }
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) throw error;
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id, email: d.email, name: d.name, agencyName: d.agency_name, phone: d.phone, role: d.role,
        subscriptionStatus: d.subscription_status, subscriptionPlan: d.subscription_plan,
        subscriptionExpiry: d.subscription_expiry, joinedDate: d.created_at, cvGeneratedCount: d.cv_generated_count || 0,
        personalApiKey: d.personal_api_key
      }));
    } catch (e) {
      console.warn("Profiles fetch fallback:", e);
      return [DEMO_USER];
    }
  };

  const addSubscription = async (userId: string, type: 'month' | 'year' | '15days') => {
    const { data } = await supabase.from('profiles').select('subscription_expiry').eq('id', userId).single();
    let currentExpiry = data?.subscription_expiry ? new Date(data.subscription_expiry) : new Date();
    if (currentExpiry < new Date()) currentExpiry = new Date();
    if (type === 'month') currentExpiry.setMonth(currentExpiry.getMonth() + 1);
    else if (type === 'year') currentExpiry.setFullYear(currentExpiry.getFullYear() + 1);
    else if (type === '15days') currentExpiry.setDate(currentExpiry.getDate() + 15);
    await supabase.from('profiles').update({ subscription_status: 'active', subscription_expiry: currentExpiry.toISOString() }).eq('id', userId);
  };

  const terminateUser = async (userId: string) => {
    await supabase.from('profiles').update({ subscription_status: 'inactive' }).eq('id', userId);
  };

  const promoteSelf = async () => {
    if (user) { await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id); refreshUser(); }
  };

  const getApiKeys = async () => {
    let cloudKeys: any[] = [];
    // 1. Try gemini_keys table
    try {
      const { data, error } = await supabase.from('gemini_keys').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        data.forEach(row => {
          cloudKeys.push({
            id: row.id,
            key_value: row.key || row.key_value || row.api_key,
            is_active: row.is_active ?? true,
            created_at: row.created_at,
            table: 'gemini_keys'
          });
        });
      }
    } catch {}

    // 2. Try api_vault table
    try {
      const { data, error } = await supabase.from('api_vault').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        data.forEach(row => {
          if (!cloudKeys.some(ck => ck.key_value === row.key_value)) {
            cloudKeys.push({
              id: row.id,
              key_value: row.key_value,
              is_active: row.is_active ?? true,
              created_at: row.created_at,
              table: 'api_vault'
            });
          }
        });
      }
    } catch (e) {
      console.warn("api_vault fetch note:", e);
    }

    let localKeys: any[] = [];
    try {
      const saved = localStorage.getItem('pixel_api_vault');
      if (saved) localKeys = JSON.parse(saved);
    } catch {}

    const combined = [...cloudKeys];
    localKeys.forEach((lk: any) => {
      if (!combined.some(ck => ck.key_value === lk.key_value)) {
        combined.push(lk);
      }
    });
    return combined;
  };

  const addApiKey = async (key_value: string) => {
    const trimmed = key_value.trim();
    if (!trimmed) return;

    let insertedToCloud = false;

    // Try inserting into gemini_keys
    try {
      const { error: gkErr } = await supabase.from('gemini_keys').insert([{ key: trimmed, is_active: true }]);
      if (!gkErr) insertedToCloud = true;
    } catch {}

    // Also try inserting into api_vault
    try {
      const { error } = await supabase.from('api_vault').insert([{ key_value: trimmed, is_active: true }]);
      if (!error) insertedToCloud = true;
    } catch {}

    if (!insertedToCloud) {
      try {
        const local = JSON.parse(localStorage.getItem('pixel_api_vault') || '[]');
        local.unshift({
          id: 'local_' + crypto.randomUUID(),
          key_value: trimmed,
          is_active: true,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('pixel_api_vault', JSON.stringify(local));
      } catch {}
    }

    if ((window as any).process?.env) (window as any).process.env.API_KEY = trimmed;
    if ((globalThis as any).process?.env) (globalThis as any).process.env.API_KEY = trimmed;
    try { localStorage.setItem('pixel_active_key', trimmed); } catch {}
  };

  const toggleApiKey = async (id: string, is_active: boolean) => {
    try {
      await supabase.from('gemini_keys').update({ is_active }).eq('id', id);
    } catch (e) {}
    try {
      await supabase.from('api_vault').update({ is_active }).eq('id', id);
    } catch (e) {}

    try {
      const local = JSON.parse(localStorage.getItem('pixel_api_vault') || '[]');
      const updated = local.map((k: any) => k.id === id ? { ...k, is_active } : k);
      localStorage.setItem('pixel_api_vault', JSON.stringify(updated));
    } catch {}
  };

  const deleteApiKey = async (id: string) => {
    try {
      await supabase.from('gemini_keys').delete().eq('id', id);
    } catch (e) {}
    try {
      await supabase.from('api_vault').delete().eq('id', id);
    } catch (e) {}

    try {
      const local = JSON.parse(localStorage.getItem('pixel_api_vault') || '[]');
      const updated = local.filter((k: any) => k.id !== id);
      localStorage.setItem('pixel_api_vault', JSON.stringify(updated));
    } catch {}
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, settings, templates, login, register, logout, refreshUser,
      updateProfile, changePassword, trackGeneration, saveSettings, saveTemplate,
      deleteTemplate, getAllUsers, addSubscription, terminateUser, promoteSelf,
      getApiKeys, addApiKey, toggleApiKey, deleteApiKey, cycleApiKey
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
