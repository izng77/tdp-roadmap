import React from 'react';
import { Search, Heart, Database, BookOpen, Lock } from 'lucide-react';
import { cn, getTierName } from '../../utils';
import { Opportunity, Profile } from '../../types';

interface CatalogTabProps {
    catalog: Opportunity[];
    filteredCatalog: Opportunity[];
    profile: Profile;
    activeTab: number;
    search: string; setSearch: (v: string) => void;
    tierFilter: string; setTierFilter: (v: string) => void;
    levelFilter: string; setLevelFilter: (v: string) => void;
    termFilter: string; setTermFilter: (v: string) => void;
    weekFilter: string; setWeekFilter: (v: string) => void;
    showFilters: boolean; setShowFilters: (v: boolean) => void;
    domainFilters: string[]; setDomainFilters: (v: string[]) => void;
    showBookmarksOnly: boolean; setShowBookmarksOnly: (v: boolean) => void;
    filterOptions: any;
    handleToggleBookmark: (item: Opportunity) => Promise<void>;
    isTierLocked: (item: Opportunity) => boolean;
    getLockReason: (item: Opportunity) => string;
    setSelectedItem: (item: Opportunity) => void;
    handleEnrollClick: (item: Opportunity) => void;
}

export function CatalogTab({
    catalog, filteredCatalog, profile, activeTab,
    search, setSearch, tierFilter, setTierFilter,
    levelFilter, setLevelFilter, termFilter, setTermFilter,
    weekFilter, setWeekFilter, showFilters, setShowFilters,
    domainFilters, setDomainFilters, showBookmarksOnly, setShowBookmarksOnly,
    filterOptions, handleToggleBookmark, isTierLocked, getLockReason,
    setSelectedItem, handleEnrollClick
}: CatalogTabProps) {
    return (
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
                <div className="flex overflow-x-auto md:flex-wrap items-center gap-3 pb-4 pt-2 relative z-10 scrollbar-hide -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0">
                    <button onClick={() => setDomainFilters([])} className={cn("whitespace-nowrap shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", domainFilters.length === 0 ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}>
                        All Domains
                    </button>
                    <button onClick={() => setShowBookmarksOnly(!showBookmarksOnly)} className={cn("whitespace-nowrap shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm flex items-center gap-2", showBookmarksOnly ? "bg-red-50 text-red-600 border-red-200 shadow-md shadow-red-500/10" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low")}>
                        <Heart className={cn("w-4 h-4", showBookmarksOnly ? "fill-current" : "")} />
                        {showBookmarksOnly ? "Show All" : "Bookmarked Only"}
                    </button>
                    {Array.from(new Set(catalog.map(item => (item.domain || "General").trim()))).sort().map(d => {
                        const isActive = domainFilters.includes(d.toLowerCase());
                        return (
                            <button key={d} onClick={() => { const lowerD = d.toLowerCase(); if (isActive) { setDomainFilters(domainFilters.filter(filter => filter !== lowerD)); } else { setDomainFilters([...domainFilters, lowerD]); } }} className={cn("whitespace-nowrap shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", isActive ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}>
                                {d}
                            </button>
                        );
                    })}
                    <div className="md:ml-auto flex items-center gap-2 md:pl-4 shrink-0">
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
                    const added = profile.planned.some(p => p.opportunityId === item.id) || profile.completed.some(c => c.opportunityId === item.id);
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
                                    ) : profile.pending.some(p => p.opportunityId === item.id) ? (
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
    );
}
