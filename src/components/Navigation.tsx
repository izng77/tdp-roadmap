import React from 'react';
import { LayoutDashboard, Users, BookOpen, TrendingUp, Settings, Bell, Search, Menu, X, ArrowLeft, Star, Clock, Home, Calendar, GraduationCap } from 'lucide-react';
import { User } from 'firebase/auth';
import { Profile } from '../types';
import { cn } from '../utils';

interface NavProps {
    profile: Profile;
    activeTab: number;
    setActiveTab: (tab: number) => void;
    isAdminUser: boolean;
    showAdminPanel: boolean;
    setShowAdminPanel: (show: boolean) => void;
}

export const TopNavBar: React.FC<NavProps & { user: User | null }> = ({ profile, activeTab, setActiveTab, isAdminUser, showAdminPanel, setShowAdminPanel, user }) => {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-[100] px-6 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="font-display font-black text-lg tracking-tighter text-primary">TDP</span>
            </div>
            <button className="p-2 text-slate-600">
                <Menu className="w-6 h-6" />
            </button>
        </header>
    );
};

export const SideNavBar: React.FC<NavProps> = ({ profile, activeTab, setActiveTab, isAdminUser, showAdminPanel, setShowAdminPanel }) => {
    const tabs = showAdminPanel 
        ? [
            { id: 0, icon: LayoutDashboard, label: 'Overview' },
            { id: 1, icon: BookOpen, label: 'Catalog' },
            { id: 2, icon: Users, label: 'Students' },
            { id: 3, icon: Bell, label: 'Requests' },
            { id: 4, icon: TrendingUp, label: 'Analytics' },
            { id: 5, icon: Settings, label: 'Settings' }
          ]
        : [
            { id: 0, icon: LayoutDashboard, label: 'Dashboard' },
            { id: 1, icon: Search, label: 'Catalog' },
            { id: 2, icon: Calendar, label: 'Schedule' },
            { id: 3, icon: GraduationCap, label: 'Achievements' },
            { id: 4, icon: Settings, label: 'Settings' }
          ];

    return (
        <nav className="fixed top-0 left-0 bottom-0 w-[88px] bg-white border-r border-slate-200 z-[100] hidden md:flex flex-col items-center py-8">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-12 shadow-lg shadow-primary/20 rotate-3">
                <Star className="w-6 h-6 text-white fill-white" />
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative",
                            activeTab === tab.id 
                                ? "bg-primary text-white shadow-xl shadow-primary/20" 
                                : "text-slate-400 hover:bg-slate-50 hover:text-primary"
                        )}
                    >
                        <tab.icon className="w-5 h-5" />
                        <div className="absolute left-16 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                            {tab.label}
                        </div>
                    </button>
                ))}
            </div>

            {isAdminUser && (
                <button
                    onClick={() => setShowAdminPanel(!showAdminPanel)}
                    className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all mt-auto border-2",
                        showAdminPanel 
                            ? "bg-secondary/10 border-secondary text-secondary" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-600"
                    )}
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}
        </nav>
    );
};

export const DesktopTopBar: React.FC<{ profile: Profile; focusMode: boolean; setFocusMode: (f: boolean) => void }> = ({ profile, focusMode, setFocusMode }) => {
    return (
        <div className="hidden md:flex h-20 items-center justify-between px-10 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center gap-4">
                <div className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Session Active</div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>

            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setFocusMode(!focusMode)}
                    className={cn(
                        "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        focusMode ? "bg-primary text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                >
                    {focusMode ? 'Focus: ON' : 'Focus Mode'}
                </button>
                
                <div className="h-8 w-px bg-slate-200"></div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[11px] font-black text-primary uppercase tracking-tight">{profile.studentName}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Year 1 Student</div>
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center font-display font-black text-primary text-xs shadow-sm">
                        {profile.studentName.charAt(0)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const BottomNavBar: React.FC<{ activeTab: number; setActiveTab: (t: number) => void; showAdminPanel: boolean }> = ({ activeTab, setActiveTab, showAdminPanel }) => {
    const tabs = showAdminPanel 
        ? [
            { id: 0, icon: LayoutDashboard, label: 'Home' },
            { id: 1, icon: BookOpen, label: 'Catalog' },
            { id: 3, icon: Bell, label: 'Requests' }
          ]
        : [
            { id: 0, icon: Home, label: 'Home' },
            { id: 1, icon: Search, label: 'Catalog' },
            { id: 2, icon: Calendar, label: 'Schedule' }
          ];

    return (
        <div className="md:hidden fixed bottom-6 left-6 right-6 z-[100] animate-fadeInUp">
            <div className="glass-panel px-6 py-4 rounded-[2.5rem] shadow-2xl flex items-center justify-around border border-white/20">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex flex-col items-center gap-1.5 transition-all duration-300",
                            activeTab === tab.id ? "text-white scale-110" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <tab.icon className={cn("w-6 h-6", activeTab === tab.id ? "fill-white/10" : "")} />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em]">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};