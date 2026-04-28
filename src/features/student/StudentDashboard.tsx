import React, { useState } from 'react';
import { Lock, ShieldCheck, X, CheckCircle2, Users } from 'lucide-react';
import { User } from 'firebase/auth';
import { Opportunity, Profile } from '../../types';
import { cn, getTierName } from '../../utils';
import { DesktopTopBar, TopNavBar, SideNavBar, BottomNavBar } from '../../components/Navigation';
import { DashboardTab } from './DashboardTab';
import { CatalogTab } from './CatalogTab';
import { ScheduleTab } from './ScheduleTab';
import { AchievementsTab } from './AchievementsTab';
import { SettingsTab } from './SettingsTab';

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
    isProfileReady: boolean;
}

export function StudentDashboard({
    user, profile, setProfile, catalog,
    activeTab, setActiveTab, isAdminUser,
    showAdminPanel, setShowAdminPanel, toast,
    showNotification, handleToggleBookmark, handleAdd,
    handleDragEnd, handleRemoveItem, handleCompleteCourse,
    isTierLocked, getLockReason, getUnlockSuggestions,
    chartData, topDomain, filterOptions,
    focusMode, setFocusMode, isProfileReady
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
        } catch (err: any) {
            console.error("Enrollment Error:", err);
            showNotification(`Failed to submit enrollment request: ${err.message}`, "err");
        } finally {
            setIsEnrolling(false);
        }
    };


    return (
        <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
            <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
            <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />

            <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
                <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />

                <div className="w-full max-w-[1200px] mx-auto">
                    <DashboardTab
                        profile={profile} activeTab={activeTab} setActiveTab={setActiveTab}
                        focusMode={focusMode} topDomain={topDomain} chartData={chartData}
                        filteredCatalog={filteredCatalog} isTierLocked={isTierLocked} setSelectedItem={setSelectedItem}
                        handleEnrollClick={handleEnrollClick} handleAdd={handleAdd}
                        isProfileReady={isProfileReady}
                    />
                    <CatalogTab
                        catalog={catalog} filteredCatalog={filteredCatalog} profile={profile}
                        activeTab={activeTab} search={search} setSearch={setSearch}
                        tierFilter={tierFilter} setTierFilter={setTierFilter}
                        levelFilter={levelFilter} setLevelFilter={setLevelFilter}
                        termFilter={termFilter} setTermFilter={setTermFilter}
                        weekFilter={weekFilter} setWeekFilter={setWeekFilter}
                        showFilters={showFilters} setShowFilters={setShowFilters}
                        domainFilters={domainFilters} setDomainFilters={setDomainFilters}
                        showBookmarksOnly={showBookmarksOnly} setShowBookmarksOnly={setShowBookmarksOnly}
                        filterOptions={filterOptions} handleToggleBookmark={handleToggleBookmark}
                        isTierLocked={isTierLocked} getLockReason={getLockReason}
                        setSelectedItem={setSelectedItem} handleEnrollClick={handleEnrollClick}
                    />
                    <ScheduleTab
                        profile={profile} activeTab={activeTab} setActiveTab={setActiveTab}
                        handleRemoveItem={handleRemoveItem} handleDragEnd={handleDragEnd}
                        setConfirmCompleteItem={setConfirmCompleteItem}
                    />
                    <AchievementsTab profile={profile} activeTab={activeTab} />
                    <SettingsTab profile={profile} activeTab={activeTab} user={user} />

                    {/* Modals */}
                    {selectedItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative max-h-[85vh] overflow-y-auto overscroll-contain">
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

                                {!(isTierLocked(selectedItem) || profile.planned.some(p => p.opportunityId === selectedItem.id) || profile.completed.some(c => c.opportunityId === selectedItem.id) || profile.pending.some(p => p.opportunityId === selectedItem.id)) && (
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
                                            const alreadyEnrolled = profile.planned.some(p => p.opportunityId === selectedItem.id) || profile.completed.some(c => c.opportunityId === selectedItem.id) || profile.pending.some(p => p.opportunityId === selectedItem.id);
                                            if (!enrollJustification && !isTierLocked(selectedItem) && !alreadyEnrolled) {
                                                showNotification("Please provide a statement of interest.", "err");
                                                return;
                                            }
                                            handleEnrollClick(selectedItem);
                                        }}
                                        disabled={!isProfileReady || isEnrolling || isTierLocked(selectedItem) || profile.planned.some(p => p.opportunityId === selectedItem.id) || profile.completed.some(c => c.opportunityId === selectedItem.id) || profile.pending.some(p => p.opportunityId === selectedItem.id)}
                                        className={cn(
                                            "flex-1 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md active:scale-95",
                                            (!isProfileReady || isEnrolling || isTierLocked(selectedItem) || profile.planned.some(p => p.opportunityId === selectedItem.id) || profile.completed.some(c => c.opportunityId === selectedItem.id) || profile.pending.some(p => p.opportunityId === selectedItem.id))
                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                                        )}
                                    >
                                        {!isProfileReady ? 'Syncing Profile...' : isEnrolling ? 'Submitting...' : isTierLocked(selectedItem) ? 'Locked Requirement' : profile.planned.some(p => p.opportunityId === selectedItem.id) || profile.completed.some(c => c.opportunityId === selectedItem.id) ? 'Already Enrolled' : profile.pending.some(p => p.opportunityId === selectedItem.id) ? 'Pending Approval' : 'Submit Enrollment Request'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {confirmCompleteItem && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                            <div className="bg-white rounded-3xl p-6 md:p-8 max-sm w-full shadow-2xl relative max-h-[85vh] overflow-y-auto overscroll-contain">
                                <button onClick={() => setConfirmCompleteItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex flex-col items-center justify-center mb-6 mx-auto">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-display font-bold text-slate-900 mb-2 text-center">Request Completion Verification?</h2>
                                <p className="text-slate-500 mb-8 text-center text-sm font-medium">Are you sure you want to request completion for <span className="font-bold text-slate-900">{confirmCompleteItem.name}</span>? A teacher will review and verify this before awarding mastery points.</p>

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
                                        Send Request
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
