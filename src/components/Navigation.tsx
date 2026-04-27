import React from 'react';
import { Search, LayoutDashboard, BookOpen, Users, Bell, TrendingUp, Settings, Shield, Calendar, Star } from 'lucide-react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../utils';
import { Profile } from '../types';

export function DesktopTopBar({ profile, focusMode, setFocusMode }: { profile: Profile, focusMode: boolean, setFocusMode: (v: boolean) => void }) {
  return (
    <div className="hidden md:flex items-center w-full h-20 border-b border-outline-variant glass-panel sticky top-0 z-30 shadow-sm">
      <div className="w-full max-w-container-max mx-auto px-10 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-outline transition-colors group-focus-within:text-secondary" />
            <input 
              type="text" 
              placeholder="Search courses, peers..." 
              className="w-full bg-white/50 border border-outline-variant rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all shadow-sm focus:bg-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button
            id="focus-mode-toggle"
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode (TL;DR View)'}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all active:scale-95",
              focusMode
                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                : "bg-white text-on-surface-variant border-outline-variant hover:border-secondary hover:text-secondary shadow-sm"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            {focusMode ? 'Focus ON' : 'Focus Mode'}
          </button>
          <button onClick={() => alert('Settings available via sidebar')} className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-primary shadow-md hover:shadow-lg transition-all border border-white/20 active:scale-95">
            {profile?.studentName?.charAt(0) || 'U'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TopNavBar({ profile, activeTab, setActiveTab, isAdminUser, showAdminPanel, setShowAdminPanel }: any) {
  return (
    <header className="md:hidden w-full sticky top-0 z-50 border-b border-outline-variant glass-panel shadow-sm">
      <div className="flex justify-between items-center w-full px-5 py-3">
        <div onClick={() => setActiveTab(showAdminPanel ? 5 : 4)} className="w-9 h-9 rounded-full overflow-hidden bg-surface-dim flex items-center justify-center shrink-0 border border-outline-variant cursor-pointer active:scale-95 transition-transform">
          <img src={profile.studentName === 'Test Student' ? "https://i.pravatar.cc/150?u=mock" : "https://i.pravatar.cc/150?u=a042581f4e29026704d"} className="w-full h-full object-cover" alt="User" />
        </div>
        <div className="font-display font-black text-xs text-primary tracking-widest uppercase">
          SAJC TDP Roadmap
        </div>
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <button 
              onClick={() => {
                setShowAdminPanel(!showAdminPanel);
                setActiveTab(0);
              }} 
              className={cn("p-2 rounded-xl transition-all active:scale-90 shadow-sm", showAdminPanel ? "bg-secondary text-white" : "bg-secondary/10 text-secondary")}
              title="Toggle Teacher View"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SideNavBar({ profile, activeTab, setActiveTab, isAdminUser, showAdminPanel, setShowAdminPanel }: any) {
  const adminTabs = [
    { id: 'nav-admin-overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'nav-admin-catalog', icon: BookOpen, label: 'Catalog ' },
    { id: 'nav-admin-students', icon: Users, label: 'Students' },
    { id: 'nav-admin-requests', icon: Bell, label: 'Requests' },
    { id: 'nav-admin-analytics', icon: TrendingUp, label: 'Analytics' },
    { id: 'nav-admin-settings', icon: Settings, label: 'Settings' }
  ];
  const studentTabs = [
    { id: 'nav-student-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'nav-student-catalog', icon: BookOpen, label: 'Course Catalog' },
    { id: 'nav-student-schedule', icon: Calendar, label: 'Schedule' },
    { id: 'nav-student-achievements', icon: Star, label: 'Achievements' },
    { id: 'nav-student-settings', icon: Settings, label: 'Settings' }
  ];
  
  const tabs = showAdminPanel ? adminTabs : studentTabs;

  return (
    <nav aria-label="Main Navigation" id="desktop-sidebar-nav" className="bg-surface-dim h-screen w-[88px] hover:w-64 fixed left-0 top-0 border-r border-outline-variant flex flex-col py-10 px-4 hover:px-6 gap-y-4 z-50 transition-all duration-300 ease-in-out hidden md:flex overflow-hidden group shadow-2xl shadow-black/5">
      <button aria-label="Toggle Navigation Mode" id="toggle-admin-panel-btn" className="mb-10 flex flex-col items-center text-center cursor-pointer border-none bg-transparent active:scale-95 transition-transform" onClick={() => isAdminUser ? setShowAdminPanel(!showAdminPanel) : null}>
        <div className="w-14 h-14 shrink-0 rounded-full bg-primary text-white flex items-center justify-center mb-4 shadow-lg shadow-primary/20 font-bold text-xl transition-all duration-300 group-hover:w-16 group-hover:h-16 group-hover:text-2xl border-2 border-white/10">
          {isAdminUser ? 'A' : profile?.studentName?.charAt(0) || 'U'}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300 px-2">
            <h1 className="text-2xl font-black text-primary tracking-tighter font-display leading-none">SAJC</h1>
            <p className="text-[10px] text-outline font-bold tracking-[0.2em] uppercase mt-1.5">{showAdminPanel ? 'Teacher Console' : 'TDP Roadmap'}</p>
        </div>
      </button>
      <div className="flex-1 flex flex-col gap-2" role="menu">
        {tabs.map((item, i) => (
          <button
            key={i}
            id={item.id}
            role="menuitem"
            aria-current={activeTab === i ? 'page' : undefined}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-4 py-3.5 rounded-2xl flex items-center transition-all w-full text-left font-sans text-sm font-bold tracking-wide overflow-hidden group/item cursor-pointer",
              activeTab === i
                ? "bg-primary text-white shadow-xl shadow-primary/20"
                : "text-on-surface-variant hover:text-primary hover:bg-white hover:shadow-md"
            )}
          >
            <item.icon aria-hidden="true" className={cn("w-6 h-6 shrink-0 transition-transform", activeTab !== i && "group-hover/item:scale-110")} />
            <span className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function BottomNavBar({ activeTab, setActiveTab, showAdminPanel }: any) {
  const adminTabs = [
    { icon: LayoutDashboard, label: 'OVERVIEW' },
    { icon: BookOpen, label: 'CATALOG' },
    { icon: Users, label: 'STUDENTS' },
    { icon: Bell, label: 'REQUESTS' },
    { icon: TrendingUp, label: 'ANALYTICS' }
  ];
  const studentTabs = [
    { icon: LayoutDashboard, label: 'DASHBOARD' },
    { icon: BookOpen, label: 'COURSES' },
    { icon: Calendar, label: 'SCHEDULE' },
    { icon: TrendingUp, label: 'PROGRESS' }
  ];
  const tabs = showAdminPanel ? adminTabs : studentTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-6 pointer-events-none">
      <div className="glass-panel w-full mx-auto max-w-sm rounded-2xl flex justify-between items-center px-2 py-1.5 pointer-events-auto shadow-2xl border border-white/20">
        {tabs.map((item, i) => (
          <button 
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] p-2.5 rounded-xl transition-all active:scale-90",
              activeTab === i 
                ? "bg-primary text-white shadow-lg" 
                : "text-on-surface-variant/60 hover:text-primary hover:bg-primary/5"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" strokeWidth={activeTab === i ? 2.5 : 2} />
            <span className="font-display text-[8px] font-black tracking-widest uppercase leading-none opacity-80">
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
