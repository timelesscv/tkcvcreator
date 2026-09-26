
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
        <div className="min-h-screen bg-primary text-slate-200 p-3 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 gap-4 bg-secondary/50 p-4 sm:p-6 rounded-3xl border border-white/5">
                    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pixel to-purple-800 rounded-2xl flex items-center justify-center shadow-lg shadow-pixel/20 shrink-0">
                                <Crown className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-2">
                                    Pixel Control
                                    {isRealtime && <span className="text-[9px] px-2 py-0.5 bg-green-900/40 text-green-400 border border-green-800 rounded-full flex items-center gap-1"><Zap size={8}/> Live</span>}
                                </h1>
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                    Admin Supervision Suite
                                </div>
                            </div>
                        </div>

                        {/* Mobile quick actions */}
                        <div className="flex items-center gap-2 sm:hidden">
                            <button onClick={() => refreshData(false)} className="p-2.5 bg-surface rounded-xl border border-white/5 hover:bg-surfaceElevated transition-colors" disabled={loading}>
                                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={logout} className="p-2.5 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-bold text-xs uppercase hover:bg-red-900/40 transition-all">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                        <div className="grid grid-cols-2 sm:flex gap-1.5 p-1 bg-primary rounded-2xl border border-white/5">
                            <button 
                              onClick={() => setActiveTab('agencies')}
                              className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${activeTab === 'agencies' ? 'bg-pixel text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >Agencies ({filteredUsers.length})</button>
                            <button 
                              onClick={() => setActiveTab('vault')}
                              className={`text-[11px] font-black uppercase px-4 py-2 rounded-xl transition-all ${activeTab === 'vault' ? 'bg-pixel text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                            >API Vault ({apiKeys.length})</button>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                            <button onClick={() => refreshData(false)} className="p-3 bg-secondary rounded-xl border border-white/5 hover:bg-surface transition-colors" disabled={loading} title="Refresh Data">
                                <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                            </button>
                            <button onClick={logout} className="px-5 py-3 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl font-black text-xs uppercase hover:bg-red-900/40 transition-all">
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* DIAGNOSTICS */}
                {(fetchError || (activeTab === 'agencies' && users.length === 0)) && (
                    <div className="mb-8 p-4 sm:p-6 bg-red-900/10 border border-red-500/30 rounded-3xl animate-fade-in-down">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-red-500 shrink-0" size={24} />
                            <div className="flex-1">
                                <h3 className="font-bold text-red-200 text-base sm:text-lg">System Alerts</h3>
                                <p className="text-xs sm:text-sm text-red-300 opacity-80 mt-1">
                                    {fetchError ? `Database Error: ${fetchError.message}` : "0 agencies returned. Check RLS policies."}
                                </p>
                                <div className="flex flex-wrap gap-2 sm:gap-3 mt-4">
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
                    <div className="flex items-center gap-3 bg-secondary p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-white/5 mb-6">
                        <Search className="text-slate-600 shrink-0" size={18} />
                        <input 
                            placeholder="Search agencies by name or email..." 
                            className="bg-transparent border-none outline-none text-white w-full font-bold text-xs sm:text-sm placeholder:text-slate-600"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>

                    {/* MOBILE CARD VIEW (< md screens) */}
                    <div className="block md:hidden space-y-4">
                        {filteredUsers.map((u, i) => (
                            <div key={u.id} className="bg-secondary p-5 rounded-3xl border border-surfaceElevated space-y-4 shadow-xl relative overflow-hidden">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-slate-500">#{i + 1}</span>
                                            <h3 className="font-black text-white text-base leading-tight uppercase tracking-tight truncate">{u.agencyName}</h3>
                                        </div>
                                        <div className="text-xs text-slate-300 font-bold mt-1 truncate">{u.name}</div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{u.email}</div>
                                        {u.phone && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.phone}</div>}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${getStatusColor(u.subscriptionStatus, u.subscriptionExpiry)} inline-flex items-center gap-1`}>
                                        {u.subscriptionStatus === 'active' ? <Zap size={10}/> : <ShieldBan size={10}/>}
                                        {u.subscriptionStatus}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 p-3 bg-primary/80 rounded-2xl border border-surfaceElevated/60 text-xs">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">CVs Produced</span>
                                        <span className="text-lg font-black text-white">{u.cvGeneratedCount}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Access Expiry</span>
                                        <span className={`font-mono font-bold text-xs mt-1 block truncate ${u.subscriptionExpiry && new Date(u.subscriptionExpiry) < new Date() ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {u.subscriptionExpiry ? new Date(u.subscriptionExpiry).toLocaleDateString() : 'Unlimited'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1 border-t border-surfaceElevated/40">
                                    <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Quick Extensions:</div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            onClick={() => handleAddSub(u.id, '15days')} 
                                            className="py-2.5 px-2 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-[11px] font-black uppercase hover:bg-purple-500/30 transition-all flex items-center justify-center gap-1 active:scale-95"
                                        >
                                            <Calendar size={13}/> +15D
                                        </button>
                                        <button 
                                            onClick={() => handleAddSub(u.id, 'month')} 
                                            className="py-2.5 px-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-black uppercase hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1 active:scale-95"
                                        >
                                            <Calendar size={13}/> +1M
                                        </button>
                                        <button 
                                            onClick={() => handleAddSub(u.id, 'year')} 
                                            className="py-2.5 px-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl text-[11px] font-black uppercase hover:bg-blue-500/30 transition-all flex items-center justify-center gap-1 active:scale-95"
                                        >
                                            <Calendar size={13}/> +1Y
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => handleTerminate(u.id)} 
                                        className="w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 active:scale-95 mt-1"
                                    >
                                        <ShieldBan size={14}/> Terminate Access
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="bg-secondary p-8 rounded-3xl text-center text-slate-500 text-sm font-bold border border-white/5">
                                No agencies found matching your search.
                            </div>
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (>= md screens) */}
                    <div className="hidden md:block bg-white text-black rounded-[32px] shadow-2xl overflow-hidden border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse min-w-[700px]">
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
                                                    <button onClick={() => handleAddSub(u.id, '15days')} className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors" title="+15 Days"><Calendar size={14}/></button>
                                                    <button onClick={() => handleAddSub(u.id, 'month')} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="+1 Month"><Calendar size={14}/></button>
                                                    <button onClick={() => handleAddSub(u.id, 'year')} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors" title="+1 Year"><Calendar size={14}/></button>
                                                    <button onClick={() => handleTerminate(u.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors ml-2" title="Terminate"><ShieldBan size={14}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-gray-50 p-4 text-center text-[10px] font-bold text-gray-400 border-t border-gray-100">
                          {filteredUsers.length} Agencies Tracked • Admin Dashboard v1.3
                        </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 sm:space-y-8 animate-fade-in">
                    <div className="bg-secondary p-5 sm:p-8 rounded-3xl sm:rounded-[40px] border border-white/5 shadow-2xl">
                      <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter mb-4 sm:mb-6 flex items-center gap-3">
                        <Key className="text-pixel" /> Global API Vault
                      </h2>
                      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
                        <div className="flex-1 relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                          <input 
                            value={newKey} 
                            onChange={e => setNewKey(e.target.value)}
                            className="w-full bg-primary border border-surfaceElevated rounded-2xl pl-12 pr-4 py-3.5 sm:py-4 text-xs sm:text-sm text-white focus:border-pixel outline-none transition-all placeholder:text-slate-600" 
                            placeholder="Paste Gemini API Key..."
                          />
                        </div>
                        <button 
                          onClick={handleAddKey} 
                          disabled={loading || !newKey} 
                          className="px-6 sm:px-8 py-3.5 sm:py-4 bg-pixel text-white font-black text-xs uppercase rounded-2xl hover:bg-pixelDark transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                          <PlusCircle size={18}/> Add Slot
                        </button>
                      </div>

                      {/* MOBILE KEY CARDS (< md screens) */}
                      <div className="block md:hidden space-y-3">
                        {apiKeys.map(k => (
                          <div key={k.id} className="bg-primary/80 p-4 rounded-2xl border border-surfaceElevated space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs text-slate-300 font-bold tracking-tight truncate">
                                {k.key_value.substring(0, 8)}••••••••{k.key_value.slice(-4)}
                              </span>
                              <button 
                                onClick={() => confirm('Delete this API Key?') && deleteApiKey(k.id).then(() => refreshData(true))} 
                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                                title="Delete Key"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-surfaceElevated/50 text-xs">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">
                                {new Date(k.created_at).toLocaleDateString()}
                              </span>
                              <button 
                                onClick={() => handleToggleKey(k.id, k.is_active)} 
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all ${k.is_active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
                              >
                                {k.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {apiKeys.length === 0 && (
                          <div className="p-8 text-center text-slate-500 italic text-xs font-medium bg-primary/40 rounded-2xl border border-surfaceElevated">
                            Vault is empty. Add keys to balance processing load.
                          </div>
                        )}
                      </div>

                      {/* DESKTOP KEY TABLE (>= md screens) */}
                      <div className="hidden md:block bg-white rounded-[32px] overflow-hidden text-black shadow-2xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left min-w-[500px]">
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
