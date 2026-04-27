import React, { useState } from 'react';
import { Lock, ShieldCheck, X, CheckCircle2, BookOpen, Star, Users, Clock, Heart, ChevronRight, Search, Calendar, Database } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { signOut, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Opportunity, Profile } from '../../types';
import { cn, getTierName } from '../../utils';
import { SortablePlannedItem } from '../../components/SortablePlannedItem';
import { DesktopTopBar, TopNavBar, SideNavBar, BottomNavBar } from '../../components/Navigation';

interface StudentDashboardProps {
    user: User;
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    catalog: Opportunity[];
    activeTab: number;
    setActiveTab: React.Dispatch<React.SetStateAction<number>>;
    isAdminUser: boolean;
    showAdminPanel: boolean;
    setShowAdminPanel: React.Dispatch<React.SetStateAction<boolean>>;
    toast: { msg: string; type: 'success' | 'err' } | null;
    showNotification: (msg: string, type?: 'success' | 'err') => void;
    handleToggleBookmark: (item: Opportunity) => Promise<void>;
    handleAdd: (item: Opportunity, justification?: string) => Promise<boolean>;
    handleDragEnd: (event: any) => Promise<void>;
    handleRemoveItem: (docId: string) => Promise<boolean>;
    handleCompleteCourse: (item: any) => Promise<boolean>;
    isTierLocked: (item: Opportunity) => boolean;
    getLockReason: (item: Opportunity) => string;
    getUnlockSuggestions: (item: Opportunity) => Opportunity[];
    chartData: any[];
    topDomain: any;
    filterOptions: any;
    focusMode: boolean;
    setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function StudentDashboard({
    user, profile, setProfile, catalog,
    activeTab, setActiveTab, isAdminUser,
    showAdminPanel, setShowAdminPanel, toast,
    showNotification, handleToggleBookmark, handleAdd,
    handleDragEnd, handleRemoveItem, handleCompleteCourse,
    isTierLocked, getLockReason, getUnlockSuggestions,
    chartData, topDomain, filterOptions,
    focusMode, setFocusMode
}: StudentDashboardProps) {
    // Local Student UI State
    const [enrollJustification, setEnrollJustification] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
    const [directEnrollId, setDirectEnrollId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [tierFilter, setTierFilter] = useState<string>("all");
    const [levelFilter, setLevelFilter] = useState<string>("all");
    const [termFilter, setTermFilter] = useState<string>("all");
    const [weekFilter, setWeekFilter] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);
    const [domainFilters, setDomainFilters] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<Opportunity | null>(null);
    const [confirmCompleteItem, setConfirmCompleteItem] = useState<Opportunity | null>(null);

    const filteredCatalog = React.useMemo(() => {
        return catalog.filter(item => {
            const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
            const matchTier = tierFilter === "all" || item.tier.toString() === tierFilter;
            const matchLevel = levelFilter === "all" || item.level === levelFilter;
            const matchTerm = termFilter === "all" || item.term === termFilter;
            const matchWeek = weekFilter === "all" || item.week === weekFilter;
            const matchDomain = domainFilters.length === 0 || domainFilters.includes((item.domain || "").trim().toLowerCase());
            const matchBookmark = !showBookmarksOnly || profile.bookmarks.some(b => b.id === item.id);
            return matchSearch && matchTier && matchLevel && matchTerm && matchWeek && matchDomain && matchBookmark;
        });
    }, [catalog, search, tierFilter, levelFilter, termFilter, weekFilter, domainFilters, showBookmarksOnly, profile.bookmarks]);

    const handleEnrollClick = async (item: Opportunity) => {
        if (!enrollJustification.trim()) {
            showNotification("A Statement of Interest is required to enroll.", "err");
            setDirectEnrollId(item.id);
            setSelectedItem(item);
            setTimeout(() => {
                const textarea = document.querySelector('textarea');
                if (textarea) textarea.focus();
            }, 100);
            return;
        }

        setIsEnrolling(true);
        try {
            const success = await handleAdd(item, enrollJustification);
            if (success) {
                setEnrollJustification('');
                setSelectedItem(null);
                setDirectEnrollId(null);
            }
        } catch (err) {
            console.error("Enrollment Error:", err);
        } finally {
            setIsEnrolling(false);
        }
    };

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    return (
        <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
            <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
            <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />

            <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
                <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />

                <div className="w-full max-w-[1200px] mx-auto">
                    {/* Dashboard Tab */}
                    <div className={cn("flex-1 overflow-y-auto w-full px-4 md:px-0 py-8 md:py-12 no-scrollbar", activeTab === 0 ? "block" : "hidden")}>
                        <section className="bg-primary text-white rounded-xl p-8 md:px-12 md:py-10 mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center z-10 shadow-2xl shadow-primary/20 border border-white/5">
                            <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                            
                            <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                                <div className="max-w-xl">
                                    <h1 className="font-display font-black text-3xl md:text-5xl mb-4 tracking-tighter">
                                        Welcome back, {profile.studentName.split(' ')[0]}.
                                    </h1>
                                    <p className="text-base md:text-lg text-blue-100/80 font-medium leading-relaxed max-w-lg">
                                        You have <span className="text-white font-bold">{profile.planned.length} upcoming activities</span> and a new achievement badge waiting to be claimed.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between w-full md:w-auto bg-white/5 p-6 md:px-10 md:py-8 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl shrink-0">
                                    <div className="flex gap-10 mr-10">
                                        <div>
                                            <div className="text-[10px] font-black text-blue-300 tracking-[0.2em] mb-2 uppercase opacity-70">Completed</div>
                                            <div className="text-3xl md:text-4xl font-display font-black">{profile.completed.length}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-blue-300 tracking-[0.2em] mb-2 uppercase opacity-70">Planned</div>
                                            <div className="text-3xl md:text-4xl font-display font-black">{profile.planned.length}</div>
                                        </div>
                                    </div>
                                    <button onClick={() => setActiveTab(2)} className="bg-white text-primary hover:bg-blue-50 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                                        View Schedule
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Focus Mode TL;DR Banner */}
                        {focusMode && (
                            <div className="mb-6 bg-[#1A365D] text-white rounded-xl px-6 py-4 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-lg animate-fadeIn">
                                <div className="flex items-center gap-3 shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" /></svg>
                                    <span className="font-bold text-sm uppercase tracking-widest">Focus Mode — TL;DR</span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <span className="bg-white/10 px-3 py-1.5 rounded-lg font-medium">
                                        ✅ <strong>{profile.completed.length}</strong> completed
                                    </span>
                                    <span className="bg-white/10 px-3 py-1.5 rounded-lg font-medium">
                                        📌 <strong>{profile.planned.length}</strong> planned
                                    </span>
                                    <span className="bg-white/10 px-3 py-1.5 rounded-lg font-medium">
                                        🎯 Next milestone: <strong>{profile.planned[0]?.name ?? 'Enrol in a course'}</strong>
                                    </span>
                                    {topDomain && <span className="bg-white/10 px-3 py-1.5 rounded-lg font-medium">🏆 Top domain: <strong>{topDomain.subject}</strong></span>}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-6">
                            <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-8", focusMode && "hidden")}>
                                {/* Competency Profile - Radar chart block */}
                                <section className="pro-card p-8 flex flex-col h-full bg-white">
                                    <div className="flex justify-between items-center mb-8">
                                        <h2 className="font-display font-black text-xl text-primary tracking-tight">Competency Profile</h2>
                                        <button onClick={() => setActiveTab(3)} className="hidden md:flex items-center gap-1 text-[11px] font-black text-secondary hover:text-primary transition-colors uppercase tracking-widest">
                                            Explorer <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[300px]">
                                        <div className="w-full h-full relative z-10">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData} style={{ overflow: 'visible' }}>
                                                    <PolarGrid stroke="var(--color-outline-variant)" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontFamily: 'Fira Sans', fontWeight: 700, fill: 'var(--color-on-surface-variant)', dy: 4 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 15]} tick={false} axisLine={false} />
                                                    <Radar name="Completed" dataKey="Completed" stroke="var(--color-secondary)" strokeWidth={3} activeDot={{ r: 6 }} dot={{ r: 4, fill: 'var(--color-secondary)', strokeWidth: 2, stroke: '#fff' }} fill="var(--color-secondary)" fillOpacity={0.2} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-center mt-8 pt-6 border-t border-outline-variant/30">
                                        {topDomain && (topDomain.Completed > 2 || topDomain.Planned > 4) ? (
                                            <>
                                                <span className="bg-secondary/10 text-secondary text-[10px] font-black px-4 py-2 rounded-lg border border-secondary/20 flex items-center shadow-sm uppercase tracking-widest">
                                                    <Star className="w-3.5 h-3.5 mr-1.5 fill-secondary" /> {topDomain.subject}
                                                </span>
                                                <span className="bg-surface-dim text-on-surface-variant text-[10px] font-black px-4 py-2 rounded-lg border border-outline-variant uppercase tracking-widest">
                                                    {topDomain.Completed + topDomain.Planned - 6 > 0 ? (topDomain.Completed + topDomain.Planned - 6) * 10 : 0} Mastery Points
                                                </span>
                                            </>
                                        ) : (
                                            <span className="bg-surface-dim text-on-surface-variant text-[10px] font-bold px-4 py-2 rounded-lg border border-outline-variant opacity-60">
                                                No competency data available yet.
                                            </span>
                                        )}
                                    </div>
                                </section>

                                {/* Mastery Progression */}
                                <section className="pro-card p-8 flex flex-col h-full bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="font-display font-black text-xl text-primary tracking-tight">Mastery Progression</h2>
                                        <span className="bg-success/10 text-success text-[10px] font-black px-4 py-2 rounded-lg border border-success/20 flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                                            <Star className="w-3.5 h-3.5 fill-success" /> 
                                            {profile.completed.reduce((a, c) => a + c.tier, 0) * 10} pts
                                        </span>
                                    </div>
                                    <p className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-10 opacity-60">Status: Advanced Tier</p>

                                    <div className="mb-8">
                                        <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">
                                            <span>Current Stage</span>
                                            <span>Elite (3,000 pts)</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-surface-dim rounded-full overflow-hidden border border-outline-variant/30 p-0.5">
                                            <div className="h-full bg-success rounded-full shadow-lg shadow-success/20 transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(5, (profile.completed.reduce((a, c) => a + c.tier, 0) * 10) / 30))}%` }}></div>
                                        </div>
                                        <p className="text-[10px] font-bold text-outline mt-3 text-right tabular-nums">{3000 - (profile.completed.reduce((a, c) => a + c.tier, 0) * 10)} PTS TO ELITE</p>
                                    </div>

                                    <div className="flex gap-4 mb-8">
                                        <div className="bg-surface-dim p-5 flex-1 flex flex-col items-center justify-center rounded-xl border border-outline-variant/30">
                                            <span className="text-[10px] font-black text-outline tracking-widest mb-1.5 uppercase">Tier 1</span>
                                            <span className="text-2xl font-display font-black text-primary tabular-nums">{profile.completed.reduce((a, c) => a + (c.tier === 1 ? 10 : 0), 0) || 0}</span>
                                        </div>
                                        <div className="bg-surface-dim p-5 flex-1 flex flex-col items-center justify-center rounded-xl border border-outline-variant/30">
                                            <span className="text-[10px] font-black text-outline tracking-widest mb-1.5 uppercase">Tier 2</span>
                                            <span className="text-2xl font-display font-black text-primary tabular-nums">{profile.completed.reduce((a, c) => a + (c.tier === 2 ? 20 : 0), 0) || 0}</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 mt-auto border-t border-outline-variant/30 pt-8">
                                        <h3 className="text-[10px] font-black text-outline uppercase tracking-widest mb-6">Recent Achievements</h3>
                                        {profile.completed.length === 0 ? (
                                            <div className="text-center py-10 bg-surface-dim rounded-xl border border-outline-variant border-dashed">
                                                <p className="text-xs font-bold text-outline opacity-60">No milestones recorded yet.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {profile.completed.slice(-2).reverse().map((c, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-surface-bright px-5 py-4 rounded-xl border border-outline-variant shadow-sm group/item hover:border-secondary transition-all">
                                                        <div className="min-w-0 pr-4">
                                                            <p className="text-sm font-black text-primary truncate tracking-tight">{c.name}</p>
                                                            <p className="text-[10px] font-bold text-outline mt-1 uppercase tracking-wider">{c.domain}</p>
                                                        </div>
                                                        <span className="shrink-0 text-success bg-success/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-success/20">+{c.tier * 10}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Suggested Courses - hidden in focus mode */}
                            <section className={cn("bg-transparent md:bg-white md:border md:border-slate-200 md:rounded-xl md:p-6 md:shadow-sm w-full flex flex-col", focusMode && "hidden")}>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="font-display font-bold text-xl text-slate-900">Suggested Courses</h2>
                                    <button className="text-sm font-bold text-[#0151B1] hover:text-blue-700 transition-colors" onClick={() => setActiveTab(1)}>View All</button>
                                </div>

                                <div className="flex overflow-x-auto gap-4 pb-4 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0 hide-scrollbar">
                                    {filteredCatalog.slice(0, 4).map((item, idx) => {
                                        const isLocked = isTierLocked(item);
                                        return (
                                            <div key={item.id} onClick={() => setSelectedItem(item)} className="min-w-[280px] w-[280px] border border-slate-200 bg-white rounded-3xl flex flex-col overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all shrink-0">
                                                <div className="h-[140px] bg-slate-900 relative">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover opacity-80" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center opacity-30">
                                                            <BookOpen className="w-12 h-12 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-4 left-4 bg-white/95 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                                        <div className={cn("w-2 h-2 rounded-full", item.tier === 1 ? "bg-emerald-500" : item.tier === 2 ? "bg-[#0151B1]" : "bg-red-500")} />
                                                        <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">{getTierName(item.tier)}</span>
                                                    </div>
                                                </div>
                                                <div className="p-5 flex flex-col flex-grow">
                                                    <h3 className="font-display font-bold text-lg text-slate-900 mb-2 leading-tight line-clamp-1">{item.name}</h3>
                                                    <p className="text-[13px] text-slate-500 font-medium mb-6 flex-grow line-clamp-2 leading-relaxed">{item.description || 'Master core concepts and practical applications.'}</p>
                                                    <button onClick={(e) => { e.stopPropagation(); if (!isLocked && !profile.planned.some(p => p.id === item.id) && !profile.pending.some(p => p.id === item.id)) handleEnrollClick(item); }} className={cn("w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors", isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#0151B1] text-white hover:bg-blue-700 shadow-md shadow-blue-500/20", profile.planned.some(p => p.id === item.id) ? "bg-emerald-50 text-emerald-600 shadow-none" : profile.pending.some(p => p.id === item.id) ? "bg-amber-50 text-amber-600 shadow-none" : "")}>
                                                        {isLocked ? 'Locked' : profile.planned.some(p => p.id === item.id) ? 'Enrolled' : profile.pending.some(p => p.id === item.id) ? 'Pending' : 'Quick Enroll'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Catalog Tab */}
                    <div className={cn("flex-1 overflow-y-auto w-full py-stack-lg no-scrollbar animate-fadeIn", activeTab === 1 ? "block" : "hidden")}>
                        <section className="mb-section-gap px-margin-mobile md:px-0">
                            <h2 className="font-display-xl text-display-xl text-on-surface mb-stack-sm">Course Catalog</h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant mb-stack-lg max-w-2xl">Discover your next academic challenge. Browse through our comprehensive list of modules designed for advanced progression.</p>
                            <div className="relative max-w-3xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-surface-container-low border border-outline-variant text-on-surface font-body-lg text-body-lg rounded py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] placeholder:text-outline-variant"
                                    placeholder="Search courses, domains, or levels..."
                                    type="text"
                                />
                            </div>
                        </section>

                        <section className="mb-section-gap px-margin-mobile md:px-0">
                            <div className="flex flex-wrap items-center gap-3 pb-4 pt-2 relative z-10">
                                <button onClick={() => setDomainFilters([])} className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", domainFilters.length === 0 ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}>
                                    All Domains
                                </button>
                                <button onClick={() => setShowBookmarksOnly(!showBookmarksOnly)} className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm flex items-center gap-2", showBookmarksOnly ? "bg-red-50 text-red-600 border-red-200 shadow-md shadow-red-500/10" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low")}>
                                    <Heart className={cn("w-4 h-4", showBookmarksOnly ? "fill-current" : "")} />
                                    {showBookmarksOnly ? "Show All" : "Bookmarked Only"}
                                </button>
                                {Array.from(new Set(catalog.map(item => (item.domain || "General").trim()))).sort().map(d => {
                                    const isActive = domainFilters.includes(d.toLowerCase());
                                    return (
                                        <button key={d} onClick={() => { const lowerD = d.toLowerCase(); if (isActive) { setDomainFilters(domainFilters.filter(filter => filter !== lowerD)); } else { setDomainFilters([...domainFilters, lowerD]); } }} className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", isActive ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}>
                                            {d}
                                        </button>
                                    );
                                })}
                                <div className="ml-auto flex items-center gap-2 pl-4">
                                    <button onClick={() => setShowFilters(!showFilters)} className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shrink-0 shadow-sm", showFilters ? "bg-primary text-white" : "bg-surface-dim text-primary border border-outline-variant hover:bg-surface-bright")}>
                                        <Database className="w-4 h-4" /> {showFilters ? 'Hide Advanced' : 'Show Advanced'}
                                    </button>
                                </div>
                            </div>

                            {showFilters && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-8 rounded-2xl border border-outline-variant shadow-2xl shadow-primary/5 mt-6 animate-slideIn">
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-60">Academic Level</label>
                                        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded-xl px-4 py-3 text-xs font-bold text-primary focus:border-primary outline-none appearance-none cursor-pointer">
                                            <option value="all">All Levels</option>
                                            {filterOptions.levels?.map((l: string) => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-60">Target Term</label>
                                        <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded-xl px-4 py-3 text-xs font-bold text-primary focus:border-primary outline-none appearance-none cursor-pointer">
                                            <option value="all">All Terms</option>
                                            {filterOptions.terms?.map((t: string) => <option key={t} value={t}>Term {t}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-60">Specific Week</label>
                                        <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded-xl px-4 py-3 text-xs font-bold text-primary focus:border-primary outline-none appearance-none cursor-pointer">
                                            <option value="all">All Weeks</option>
                                            {filterOptions.weeks?.map((w: string) => <option key={w} value={w}>Week {w}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="block text-[10px] font-black text-outline uppercase tracking-[0.2em] opacity-60">Talent Tier</label>
                                        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="w-full bg-surface-dim border border-outline-variant rounded-xl px-4 py-3 text-xs font-bold text-primary focus:border-primary outline-none appearance-none cursor-pointer">
                                            <option value="all">All Tiers</option>
                                            <option value="1">Tier 1: Awareness</option>
                                            <option value="2">Tier 2: Develop</option>
                                            <option value="3">Tier 3: Deepen</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredCatalog.map(item => {
                                const locked = isTierLocked(item);
                                const added = profile.planned.some(p => p.id === item.id) || profile.completed.some(c => c.id === item.id);
                                const isBookmarked = profile.bookmarks.some(b => b.id === item.id);
                                return (
                                    <div key={item.id} onClick={() => setSelectedItem(item)} className="pro-card bg-white flex flex-col group cursor-pointer border border-outline-variant/30 hover:border-secondary/40 transition-all duration-500">
                                        <div className="relative h-56 bg-slate-900 border-b border-outline-variant/10 overflow-hidden shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); handleToggleBookmark(item); }} className={cn("absolute top-4 left-4 z-20 w-10 h-10 rounded-xl transition-all flex items-center justify-center backdrop-blur-xl border border-white/20", isBookmarked ? "bg-error text-white shadow-xl shadow-error/20" : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20")}>
                                                <Heart className={cn("w-5 h-5", isBookmarked ? "fill-current" : "")} />
                                            </button>
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className={cn("w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700", locked ? "grayscale opacity-30" : "")} />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                                    <BookOpen className={cn("w-16 h-16 opacity-10 text-primary", locked ? "grayscale opacity-5" : "")} />
                                                </div>
                                            )}
                                            {locked && (
                                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 px-6">
                                                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                        <Lock className="text-white w-6 h-6" />
                                                    </div>
                                                    <span className="text-white text-[10px] font-black text-center leading-tight uppercase tracking-widest drop-shadow-lg">{getLockReason(item)}</span>
                                                </div>
                                            )}
                                            <div className="absolute top-4 right-4 glass-panel px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl z-20 border border-white/10">
                                                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]", item.tier === 1 ? "bg-success" : item.tier === 2 ? "bg-secondary" : "bg-error")} />
                                                <span className="text-[10px] font-black text-white tracking-[0.15em] uppercase">{getTierName(item.tier)}</span>
                                            </div>
                                        </div>
                                        <div className="p-7 flex flex-col flex-grow">
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className="text-[9px] font-black text-secondary bg-secondary/5 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-secondary/10">{item.domain}</span>
                                                {item.level && <span className="text-[9px] font-black text-outline bg-surface-dim px-3 py-1.5 rounded-lg uppercase tracking-widest border border-outline-variant">{item.level}</span>}
                                            </div>
                                            <h3 className="font-display font-black text-lg mb-3 text-primary leading-tight group-hover:text-secondary transition-colors line-clamp-2 tracking-tight">{item.name}</h3>
                                            <p className="text-xs font-medium text-on-surface-variant opacity-60 mb-8 flex-grow line-clamp-3 leading-relaxed">{item.description || 'Master core concepts and practical applications in this specialized course.'}</p>

                                            <div className="flex flex-col gap-5 pt-6 border-t border-outline-variant/30 mt-auto">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex justify-between text-[9px] font-black text-outline uppercase tracking-widest opacity-60">
                                                        <span>Capacity</span>
                                                        <span>{item.enrolled || 0} / {item.capacity || 20}</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden border border-outline-variant/10">
                                                        <div className="h-full bg-primary/20 transition-all duration-1000" style={{ width: `${Math.min(100, ((item.enrolled || 0) / (item.capacity || 20)) * 100)}%` }}></div>
                                                    </div>
                                                </div>
                                                {locked ? (
                                                    <button className="w-full bg-surface-dim text-outline/40 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-outline-variant cursor-not-allowed">Locked Access</button>
                                                ) : added ? (
                                                    <button className="w-full bg-success/5 text-success py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-success/20 cursor-default">Registered</button>
                                                ) : profile.pending.some(p => p.id === item.id) ? (
                                                    <button className="w-full bg-secondary/5 text-secondary py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-secondary/20 cursor-default">Waitlist Pending</button>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); handleEnrollClick(item); }} className="w-full bg-primary text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 transition-all active:scale-95 hover:bg-primary/90">Enroll Now</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    </div>

                    {/* Schedule Tab */}
                    <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar animate-fadeIn", activeTab === 2 ? "block" : "hidden")}>
                        <section className="mb-section-gap px-margin-mobile md:px-0 max-w-3xl">
                            <h2 className="font-display-xl text-display-xl text-on-surface mb-stack-sm">My Schedule</h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Manage your planned academic activities and track upcoming deadlines.</p>

                            {profile.pending.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="font-display font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        Pending Enrollment ({profile.pending.length})
                                    </h2>
                                    <div className="flex flex-col gap-4">
                                        {profile.pending.map((item, idx) => (
                                            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 shrink-0">
                                                        <Clock className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{item.name}</h3>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">Waiting for teacher approval</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Cancel Request">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {profile.rejected && profile.rejected.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="font-display font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                                        <X className="w-5 h-5 text-red-500" />
                                        Needs Action / Rejected ({profile.rejected.length})
                                    </h2>
                                    <div className="flex flex-col gap-4">
                                        {profile.rejected.map((item, idx) => (
                                            <div key={item.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center text-red-500 shrink-0">
                                                        <X className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">{item.name}</h3>
                                                        <p className="text-xs text-red-500 uppercase tracking-wider font-bold mt-1">Request Denied</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveItem(item.id)} className="px-4 py-1.5 text-xs font-bold text-slate-500 border border-slate-200 rounded-full hover:bg-slate-50 transition-colors" title="Dismiss">
                                                    Dismiss
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <h2 className="font-display font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Current Schedule ({profile.planned.length})
                            </h2>

                            {profile.planned.length === 0 ? (
                                <div className="w-full flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl border-dashed">
                                    <Calendar className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="font-bold text-lg text-slate-700 mb-2">Your schedule is empty</h3>
                                    <p className="text-slate-500 mb-6 text-center max-w-xs">Explore the course catalog to find relevant modules and add them to your schedule.</p>
                                    <button onClick={() => setActiveTab(1)} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-colors shadow-sm focus:outline-none">Go to Catalog</button>
                                </div>
                            ) : (
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                    <SortableContext items={profile.planned} strategy={verticalListSortingStrategy}>
                                        <div className="flex flex-col gap-4">
                                            {profile.planned.map((item, idx) => (
                                                <SortablePlannedItem key={item.id} item={item} profile={profile} setConfirmCompleteItem={setConfirmCompleteItem} onRemove={handleRemoveItem} idx={idx} />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </section>
                    </div>

                    {/* Achievements Tab */}
                    <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar animate-fadeIn", activeTab === 3 ? "block" : "hidden")}>
                        <section className="mb-section-gap px-margin-mobile md:px-0 max-w-5xl">
                            <div className="flex flex-wrap justify-between items-center mb-stack-sm gap-3">
                                <h2 className="font-display-xl text-display-xl text-on-surface">Achievements</h2>
                            </div>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Review the modules and competencies you have mastered so far.</p>

                            {profile.completed.length === 0 ? (
                                <div className="w-full flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl border-dashed">
                                    <Star className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="font-bold text-lg text-slate-700 mb-2">No completed courses yet</h3>
                                    <p className="text-slate-500 mb-6 text-center max-w-xs">Finish your planned courses to earn points and progress to the next mastery tier.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {profile.completed.map(item => (
                                        <div key={item.id} className="bg-emerald-50/30 border border-emerald-100 rounded-lg overflow-hidden flex flex-col shadow-sm group">
                                            <div className="p-5 flex flex-col flex-grow relative">
                                                <div className="absolute top-4 right-4 bg-emerald-100 p-2 rounded-full text-emerald-600">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded w-max mb-3 uppercase tracking-wider border border-emerald-100/50">{item.domain}</span>
                                                <h3 className="font-display font-bold text-lg mb-2 text-slate-900 leading-tight pr-6">{item.name}</h3>
                                                <div className="mt-auto pt-4 flex gap-2">
                                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase">{getTierName(item.tier)} COMPLETED</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Settings Tab */}
                    <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar animate-fadeIn", activeTab === 4 ? "block" : "hidden")}>
                        <section className="mb-section-gap px-margin-mobile md:px-0 max-w-3xl">
                            <h2 className="font-display-xl text-display-xl text-on-surface mb-stack-sm">Settings</h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Manage your account preferences and view profile information.</p>

                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-display font-bold text-2xl shrink-0">
                                        {profile.studentName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-display font-bold text-xl text-slate-900">{profile.studentName}</h3>
                                        <p className="text-slate-500 text-sm">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 mb-4 hover:border-slate-200 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm mb-1">Sign Out</div>
                                            <div className="text-xs text-slate-500">Log out on this device.</div>
                                        </div>
                                        <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg text-xs tracking-wider transition-colors">Logout</button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Modals */}
                    {selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative">
                                <button onClick={() => { setSelectedItem(null); setDirectEnrollId(null); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="mb-4">
                                    <span className="font-bold text-[10px] uppercase text-slate-500 tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">{getTierName(selectedItem.tier)}</span>
                                </div>
                                <h2 className="text-2xl font-display font-bold text-slate-900 mb-1">{selectedItem.name}</h2>
                                {directEnrollId === selectedItem.id && !enrollJustification && (
                                    <div className="mb-4 text-xs font-bold text-blue-600 uppercase tracking-widest animate-pulse">
                                        Step 1: Provide your Statement of Interest below
                                    </div>
                                )}
                                <p className="text-slate-500 mb-6 font-medium">{selectedItem.description || 'Master core concepts and practical applications.'}</p>

                                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                                    <h4 className="font-bold text-sm text-slate-900 mb-2">Prerequisites</h4>
                                    <ul className="text-sm text-slate-600 space-y-1.5 mb-2">
                                        {selectedItem.tier === 1 ? (
                                            <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> No prior experience needed. Open to all students.</li>
                                        ) : selectedItem.tier === 2 ? (
                                            <li className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" /> Recommended: Complete a Tier 1 course in <strong>{selectedItem.domain}</strong> first.</li>
                                        ) : (
                                            <>
                                                <li className="flex items-start gap-2">
                                                    {isTierLocked(selectedItem)
                                                        ? <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                        : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                                                    <span>
                                                        {isTierLocked(selectedItem) ? '🔒 ' : '✅ '}
                                                        Requires a Tier 1 or Tier 2 course in <strong>{selectedItem.domain}</strong>.
                                                    </span>
                                                </li>
                                                {isTierLocked(selectedItem) && getUnlockSuggestions(selectedItem).length > 0 && (
                                                    <li className="ml-6 mt-1">
                                                        <span className="text-xs text-amber-600 font-semibold">Start with: </span>
                                                        {getUnlockSuggestions(selectedItem).map((s, i) => (
                                                            <span key={s.id} className="text-xs font-bold text-[#0151B1] cursor-pointer hover:underline" onClick={() => { setSelectedItem(s); }}>
                                                                {s.name}{i < getUnlockSuggestions(selectedItem).length - 1 ? ' or ' : ''}
                                                            </span>
                                                        ))}
                                                    </li>
                                                )}
                                            </>
                                        )}
                                    </ul>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 border-t border-slate-200/60 pt-2 mt-2">
                                        <Users className="w-4 h-4 text-purple-500 shrink-0" />
                                        <span className="font-medium">
                                            {selectedItem.enrolled || 0} / {selectedItem.capacity || 20} spots filled
                                        </span>
                                        {((selectedItem.capacity || 20) - (selectedItem.enrolled || 0) <= 0) && (
                                            <span className="text-xs text-red-500 font-bold ml-auto">(Full)</span>
                                        )}
                                    </div>
                                </div>

                                {!(isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id)) && (
                                    <div className="mb-6 animate-fadeIn">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Statement of Interest</label>
                                        <textarea
                                            value={enrollJustification}
                                            onChange={(e) => setEnrollJustification(e.target.value.substring(0, 200))}
                                            placeholder="Why do you want to join this course? (Required)"
                                            className="w-full h-24 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                                            <span>Teachers review this statement for approval</span>
                                            <span>{enrollJustification.length}/200</span>
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            const alreadyEnrolled = profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id);
                                            if (!enrollJustification && !isTierLocked(selectedItem) && !alreadyEnrolled) {
                                                showNotification("Please provide a statement of interest.", "err");
                                                return;
                                            }
                                            handleEnrollClick(selectedItem);
                                        }}
                                        disabled={isEnrolling || isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id)}
                                        className={cn(
                                            "flex-1 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md active:scale-95",
                                            (isEnrolling || isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id))
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                        )}
                                    >
                                        {isEnrolling ? 'Submitting...' : isTierLocked(selectedItem) ? 'Locked Requirement' : profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) ? 'Already Enrolled' : profile.pending.some(p => p.id === selectedItem.id) ? 'Pending Approval' : 'Submit Enrollment Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {confirmCompleteItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-3xl p-6 md:p-8 max-sm w-full shadow-2xl relative">
                                <button onClick={() => setConfirmCompleteItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex flex-col items-center justify-center mb-6 mx-auto">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-display font-bold text-slate-900 mb-2 text-center">Mark as Completed?</h2>
                                <p className="text-slate-500 mb-8 text-center text-sm font-medium">Are you sure you want to mark <span className="font-bold text-slate-900">{confirmCompleteItem.name}</span> as completed? This will award you mastery points.</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setConfirmCompleteItem(null)}
                                        className="flex-1 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const success = await handleCompleteCourse(confirmCompleteItem);
                                            if (success) setConfirmCompleteItem(null);
                                        }}
                                        className="flex-1 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {toast && (
                        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
                            <div className={cn("px-4 py-3 rounded-xl shadow-lg flex items-center gap-3", toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
                                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                <span className="font-medium text-sm">{toast.msg}</span>
                            </div>
                        </div>
                    )}

                </div>
                <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} showAdminPanel={showAdminPanel} />
            </main>
        </div>
    );
}
