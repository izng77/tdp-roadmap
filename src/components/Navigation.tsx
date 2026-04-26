import React from 'react';
import { Search, LayoutDashboard, BookOpen, Users, Bell, TrendingUp, Settings, Shield, Calendar, Star } from 'lucide-react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { cn } from '../utils';
import { Profile } from '../types';

export function DesktopTopBar({ profile, focusMode, setFocusMode }: { profile: Profile, focusMode: boolean, setFocusMode: (v: boolean) => void }) {
  return (
    <div className="hidden md:flex items-center w-full h-20 border-b border-slate-200 bg-slate-50/50 sticky top-0 z-30 backdrop-blur-md">
      <div className="w-full max-w-[1200px] mx-auto px-10 flex items-center justify-between">
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search courses, peers..." 
              className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <button
            id="focus-mode-toggle"
            onClick={() => setFocusMode(!focusMode)}
            title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode (TL;DR View)'}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border transition-all",
              focusMode
                ? "bg-[#1A365D] text-white border-[#1A365D] shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:border-[#1A365D] hover:text-[#1A365D]"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
            {focusMode ? 'Focus ON' : 'Focus Mode'}
          </button>
          <button onClick={() => alert('Settings available via sidebar')} className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-slate-800 shadow-sm hover:shadow-md transition-all">
            {profile?.studentName?.charAt(0) || 'U'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TopNavBar({ profile, activeTab, setActiveTab, isAdminUser, showAdminPanel, setShowAdminPanel }: any) {
  return (
    <header className="md:hidden w-full sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex justify-between items-center w-full px-5 py-3">
        <div onClick={() => setActiveTab(showAdminPanel ? 5 : 4)} className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 cursor-pointer">
          <img src={profile.studentName === 'Test Student' ? "https://i.pravatar.cc/150?u=mock" : "https://i.pravatar.cc/150?u=a042581f4e29026704d"} className="w-full h-full object-cover" alt="User" />
        </div>
        <div className="font-display font-black text-sm text-[#1A365D] tracking-tighter uppercase">
          SAJC TDP Roadmap
        </div>
        <div className="flex items-center gap-2">
          {isAdminUser && (
            <button 
              onClick={() => {
                setShowAdminPanel(!showAdminPanel);
                setActiveTab(0);
              }} 
              className={cn("p-1.5 rounded-lg transition-colors", showAdminPanel ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600")}
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
  
  // Custom Star icon since it's missing in studentTabs above (Star was imported but not used in the original array)
  // Wait, I should import Star.
  
  const tabs = showAdminPanel ? adminTabs : studentTabs;

  return (
    <nav aria-label="Main Navigation" id="desktop-sidebar-nav" className="bg-[#F8FAFC] h-screen w-[88px] hover:w-64 fixed left-0 top-0 border-r border-[#E2E8F0] flex flex-col py-10 px-4 hover:px-6 gap-y-4 z-50 transition-all duration-300 ease-in-out transform hidden md:flex overflow-hidden group">
      <button aria-label="Toggle Navigation Mode" id="toggle-admin-panel-btn" className="mb-10 flex flex-col items-center text-center cursor-pointer border-none bg-transparent" onClick={() => isAdminUser ? setShowAdminPanel(!showAdminPanel) : null}>
        <div className="w-14 h-14 shrink-0 rounded-full bg-[#1A365D] text-white flex items-center justify-center mb-4 shadow-sm font-bold text-xl transition-all duration-300 group-hover:w-16 group-hover:h-16 group-hover:text-2xl">
          {isAdminUser ? 'A' : profile?.studentName?.charAt(0) || 'U'}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap duration-300">
            <h1 className="text-[28px] font-extrabold text-[#1A365D] tracking-tight font-display leading-none">SAJC</h1>
            <p className="text-[13px] text-slate-500 font-medium tracking-wide mt-1">{showAdminPanel ? 'Teacher Console' : 'TDP Roadmap'}</p>
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
              "px-4 py-3.5 rounded-2xl flex items-center transition-all w-full text-left font-['Plus_Jakarta_Sans'] text-sm font-bold tracking-wide overflow-hidden",
              activeTab === i
                ? "bg-[#1A365D] text-white shadow-lg shadow-[#1A365D]/30"
                : "text-slate-500 hover:text-[#1A365D] hover:bg-slate-200/50"
            )}
          >
            <item.icon aria-hidden="true" className={cn("w-6 h-6 shrink-0", activeTab !== i && "transition-transform")} />
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
    <>
      {activeTab === 0 && !showAdminPanel && (
        <button onClick={() => setActiveTab(1)} className="md:hidden fixed bottom-28 right-6 w-14 h-14 bg-[#0151B1] hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 z-40 transition-transform active:scale-95">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      )}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pt-4 pb-8 px-2 bg-[#F8FAFC] border-t border-slate-200">
        {tabs.map((item, i) => (
          <button 
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "flex flex-col items-center justify-center min-w-[64px] transition-all duration-200 active:scale-95",
              activeTab === i 
                ? "text-[#0151B1] scale-100" 
                : "text-[#94A3B8] scale-100"
            )}
          >
            <item.icon className="w-6 h-6 mb-1.5" strokeWidth={activeTab === i ? 2.5 : 2} />
            <span className={cn("font-display text-[10px] font-bold tracking-wider leading-none", activeTab === i ? "text-[#0151B1]" : "text-[#94A3B8]")}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}

