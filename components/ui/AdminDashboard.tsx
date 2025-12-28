
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { User } from '../../types';
import { 
  LogOut, Calendar, ShieldBan, RefreshCcw, Search, Crown, 
  Activity, Zap, AlertTriangle, Terminal, Wrench, Copy, Check, 
  Key, Trash2, ToggleLeft, ToggleRight, PlusCircle 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    const { 
      logout, getAllUsers, addSubscription, terminateUser, 
      user: currentUser, promoteSelf, getApiKeys, addApiKey, 
      toggleApiKey, deleteApiKey 
    } = useAuth();
    
    const [users, setUsers] = useState<User[]>([]);
    const [apiKeys, setApiKeys] = useState<any[]>([]);
    const [newKey, setNewKey] = useState('');
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRealtime, setIsRealtime] = useState(false);
    
    const [fetchError, setFetchError] = useState<any>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [dbRole, setDbRole] = useState<string>('unknown');
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'agencies' | 'vault'>('agencies');

    const refreshData = async (isAuto = false) => {
        if (!isAuto) setLoading(true);
        setFetchError(null);
        try {
            const [allUsers, allKeys] = await Promise.all([getAllUsers(), getApiKeys()]);
            setUsers(allUsers);
            setApiKeys(allKeys);
            if (currentUser?.id) {
                const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single();
                if (data) setDbRole(data.role);
            }
        } catch (e: any) {
            console.error("Failed to load data", e);
            setFetchError(e);
        } finally {
            if (!isAuto) setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        const channel = supabase
            .channel('admin-dashboard')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => refreshData(true))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'api_vault' }, () => refreshData(true))
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setIsRealtime(true);
            });
        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.id]);

    useEffect(() => {
        if (fetchError?.code === '42P17' || (fetchError?.message || '').includes('infinite recursion')) {
            setShowDebug(true);
        }
    }, [fetchError]);

    const handleAddSub = async (id: string, type: 'month' | 'year' | '15days') => {
        const label = type === '15days' ? '15 days' : `1 ${type}`;
        if (!confirm(`Add ${label} to this user?`)) return;
        setLoading(true);
        try { await addSubscription(id, type); await refreshData(false); } catch (e: any) { alert(e.message); }
    };

    const handleTerminate = async (id: string) => {
        if (confirm('Terminate this user? Access will be lost immediately.')) {
            setLoading(true);
            try { await terminateUser(id); await refreshData(false); } catch (e: any) { alert(e.message); }
        }
    };

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        setLoading(true);
        try { await addApiKey(newKey); setNewKey(''); await refreshData(); } catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
    };

    const handleToggleKey = async (id: string, active: boolean) => {
        try { await toggleApiKey(id, !active); await refreshData(true); } catch (e: any) { alert(e.message); }
    };

    const handleCopySQL = () => {
        const sql = `-- 1. SECURITY FUNCTIONS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- 2. ENABLE RLS
alter table profiles enable row level security;
alter table api_vault enable row level security;

-- 3. PROFILES POLICIES
drop policy if exists "Admins view all" on profiles;
create policy "Admins view all" on profiles for select to authenticated using ( is_admin() OR auth.uid() = id );

drop policy if exists "Admins update all" on profiles;
create policy "Admins update all" on profiles for update to authenticated using ( is_admin() OR auth.uid() = id );

drop policy if exists "Users view own" on profiles;
create policy "Users view own" on profiles for select to authenticated using ( auth.uid() = id );

-- 4. API VAULT POLICIES
drop policy if exists "Everyone can read active keys" on api_vault;
create policy "Everyone can read active keys" on api_vault 
for select to authenticated 
using ( is_active = true OR is_admin() );

drop policy if exists "Only admins can manage keys" on api_vault;
create policy "Only admins can manage keys" on api_vault 
for all to authenticated 
using ( is_admin() );

-- 5. INITIALIZE ADMIN
update profiles set role = 'admin' where email = '${currentUser?.email}';`;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredUsers = users.filter(u => 
        (u.agencyName?.toLowerCase() || '').includes(filter.toLowerCase()) || 
        (u.email?.toLowerCase() || '').includes(filter.toLowerCase()) ||
        (u.name?.toLowerCase() || '').includes(filter.toLowerCase())
    );

    const getStatusColor = (status: string, expiry?: string) => {
        if (status === 'inactive') return 'bg-red-500/10 text-red-500 border-red-500/20';
        if (status === 'pending') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        if (expiry && new Date(expiry) < new Date()) return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    };

    return (
        <div className="min-h-screen bg-primary text-slate-200 p-4">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-pixel to-purple-800 rounded-2xl flex items-center justify-center shadow-lg shadow-pixel/20">
                            <Crown className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
                                Pixel Control
                                {isRealtime && <span className="text-[9px] px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-800 rounded-full flex items-center gap-1"><Zap size={8}/> Live</span>}
                            </h1>
                            <div className="flex gap-2 mt-1">
                                <button 
                                  onClick={() => setActiveTab('agencies')}
                                  className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition-all ${activeTab === 'agencies' ? 'bg-pixel border-pixel text-white' : 'border-white/10 text-slate-500 hover:text-white'}`}
                                >Agencies</button>
                                <button 
                                  onClick={() => setActiveTab('vault')}
                                  className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition-all ${activeTab === 'vault' ? 'bg-pixel border-pixel text-white' : 'border-white/10 text-slate-500 hover:text-white'}`}
                                >API Vault</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => refreshData(false)} className="p-3 bg-secondary rounded-xl border border-white/5 hover:bg-surface transition-colors" disabled={loading}>
                            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={logout} className="px-6 py-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-black text-xs uppercase hover:bg-red-900/40 transition-all">
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* DIAGNOSTICS */}
                {(fetchError || (activeTab === 'agencies' && users.length === 0)) && (
                    <div className="mb-8 p-6 bg-red-900/10 border border-red-500/30 rounded-3xl animate-fade-in-down">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-red-500 shrink-0" size={24} />
                            <div className="flex-1">
                                <h3 className="font-bold text-red-200 text-lg">System Alerts</h3>
                                <p className="text-sm text-red-300 opacity-80">
                                    {fetchError ? `Database Error: ${fetchError.message}` : "0 agencies returned. Check RLS policies."}
                                </p>
                                <div className="flex gap-3 mt-5">
                                    <button onClick={() => promoteSelf()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-2">
                                        <Wrench size={14} /> Repair Permissions
                                    </button>
                                    <button onClick={() => setShowDebug(!showDebug)} className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-2">
                                        <Terminal size={14} /> {showDebug ? 'Hide SQL Fix' : 'Show SQL Fix'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'agencies' ? (
                  <>
                    <div className="flex items-center gap-4 bg-secondary p-4 rounded-3xl border border-white/5 mb-6">
                        <Search className="text-slate-600" size={20} />
                        <input 
                            placeholder="Search agencies by name or email..." 
                            className="bg-transparent border-none outline-none text-white w-full font-bold text-sm"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>

                    <div className="bg-white text-black rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-5 border-b border-gray-200 w-12 text-center">#</th>
                                    <th className="p-5 border-b border-gray-200">Agency Details</th>
                                    <th className="p-5 border-b border-gray-200">Contact</th>
                                    <th className="p-5 border-b border-gray-200 text-center">Usage</th>
                                    <th className="p-5 border-b border-gray-200 text-center">Status</th>
                                    <th className="p-5 border-b border-gray-200">Expiry</th>
                                    <th className="p-5 border-b border-gray-200 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u, i) => (
                                    <tr key={u.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-100">
                                        <td className="p-4 text-center font-mono text-xs text-gray-400">{i + 1}</td>
                                        <td className="p-4">
                                            <div className="font-black text-slate-900 text-base leading-tight uppercase tracking-tight">{u.agencyName}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase mt-1">Joined: {new Date(u.joinedDate).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4 text-xs">
                                            <div className="font-bold text-gray-700">{u.name}</div>
                                            <div className="text-gray-500">{u.email}</div>
                                            <div className="text-gray-500 font-mono">{u.phone}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="text-lg font-black text-gray-900 leading-none">{u.cvGeneratedCount}</div>
                                            <div className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-widest">CVs</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(u.subscriptionStatus, u.subscriptionExpiry)} inline-flex items-center gap-1.5`}>
                                                {u.subscriptionStatus === 'active' ? <Zap size={10}/> : <ShieldBan size={10}/>}
                                                {u.subscriptionStatus}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono text-xs">
                                            {u.subscriptionExpiry ? (
                                                <div className={new Date(u.subscriptionExpiry) < new Date() ? 'text-red-500 font-bold' : 'text-green-600'}>
                                                    {new Date(u.subscriptionExpiry).toLocaleDateString()}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center gap-1.5">
                                                <button onClick={() => handleAddSub(u.id, '15days')} className="p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors" title="+15 Days"><Calendar size={14}/></button>
                                                <button onClick={() => handleAddSub(u.id, 'month')} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors" title="+1 Month"><Calendar size={14}/></button>
                                                <button onClick={() => handleAddSub(u.id, 'year')} className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors" title="+1 Year"><Calendar size={14}/></button>
                                                <button onClick={() => handleTerminate(u.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-600 hover:text-white transition-colors ml-2" title="Terminate"><ShieldBan size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="bg-gray-50 p-4 text-center text-[10px] font-bold text-gray-400 border-t border-gray-100">
                          {filteredUsers.length} Agencies Tracked • Admin Dashboard v1.3
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-8 animate-fade-in">
                    <div className="bg-secondary p-8 rounded-[40px] border border-white/5 shadow-2xl">
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-6 flex items-center gap-3">
                        <Key className="text-pixel" /> Global API Vault
                      </h2>
                      <div className="flex gap-3 mb-10">
                        <div className="flex-1 relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            value={newKey} 
                            onChange={e => setNewKey(e.target.value)}
                            className="w-full bg-primary border border-surfaceElevated rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:border-pixel outline-none transition-all placeholder:text-slate-700" 
                            placeholder="Paste Gemini API Key..."
                          />
                        </div>
                        <button onClick={handleAddKey} disabled={loading || !newKey} className="px-8 bg-pixel text-white font-black text-xs uppercase rounded-2xl hover:bg-pixelDark transition-all flex items-center gap-2 disabled:opacity-50">
                          <PlusCircle size={18}/> Add Slot
                        </button>
                      </div>

                      <div className="bg-white rounded-[32px] overflow-hidden text-black shadow-2xl">
                        <table className="w-full text-left">
                          <thead className="bg-gray-100 text-gray-500 font-black uppercase text-[10px] tracking-widest">
                            <tr>
                              <th className="p-5">API Key (Partial)</th>
                              <th className="p-5 text-center">Status</th>
                              <th className="p-5 text-center">Created</th>
                              <th className="p-5 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {apiKeys.map(k => (
                              <tr key={k.id} className="border-b border-gray-100 hover:bg-blue-50/50">
                                <td className="p-5 font-mono text-sm tracking-tighter">
                                  {k.key_value.substring(0, 12)}••••••••••••{k.key_value.slice(-4)}
                                </td>
                                <td className="p-5 text-center">
                                  <button onClick={() => handleToggleKey(k.id, k.is_active)} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${k.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                    {k.is_active ? 'Active' : 'Inactive'}
                                  </button>
                                </td>
                                <td className="p-5 text-center text-xs text-gray-400">
                                  {new Date(k.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-5">
                                  <div className="flex justify-center">
                                    <button onClick={() => confirm('Delete this API Key?') && deleteApiKey(k.id).then(() => refreshData(true))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {apiKeys.length === 0 && (
                              <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic font-medium">Vault is empty. Add keys to balance processing load.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                {showDebug && (
                  <div className="mt-8 p-6 bg-black border border-white/10 rounded-[32px] animate-fade-in relative">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-slate-400 font-bold text-sm">⚠️ CRITICAL: Run this in Supabase SQL Editor to fix Permissions:</p>
                      <button onClick={handleCopySQL} className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                        {copied ? <Check size={14}/> : <Copy size={14}/>}
                        {copied ? "Copied!" : "Copy SQL"}
                      </button>
                    </div>
                    <code className="block text-green-400 whitespace-pre-wrap select-all font-mono text-[10px] p-4 bg-gray-900 rounded-xl border border-green-900/30 overflow-x-auto max-h-96 scrollbar-hide">
{`-- 1. SECURITY FUNCTIONS
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- 2. ENABLE RLS
alter table profiles enable row level security;
alter table api_vault enable row level security;

-- 3. PROFILES POLICIES
drop policy if exists "Admins view all" on profiles;
create policy "Admins view all" on profiles for select to authenticated using ( is_admin() OR auth.uid() = id );

drop policy if exists "Admins update all" on profiles;
create policy "Admins update all" on profiles for update to authenticated using ( is_admin() OR auth.uid() = id );

drop policy if exists "Users view own" on profiles;
create policy "Users view own" on profiles for select to authenticated using ( auth.uid() = id );

-- 4. API VAULT POLICIES
drop policy if exists "Everyone can read active keys" on api_vault;
create policy "Everyone can read active keys" on api_vault 
for select to authenticated 
using ( is_active = true OR is_admin() );

drop policy if exists "Only admins can manage keys" on api_vault;
create policy "Only admins can manage keys" on api_vault 
for all to authenticated 
using ( is_admin() );

-- 5. INITIALIZE ADMIN
update profiles set role = 'admin' where email = '${currentUser?.email}';`}
                    </code>
                  </div>
                )}
            </div>
        </div>
    );
};
