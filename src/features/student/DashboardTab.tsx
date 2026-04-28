import React from 'react';
import { Star, ChevronRight, BookOpen } from 'lucide-react';
import { Chart as ChartJS, RadialLinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { cn, getTierName } from '../../utils';
import { Opportunity, Profile } from '../../types';

interface DashboardTabProps {
    profile: Profile;
    activeTab: number;
    setActiveTab: (val: number) => void;
    focusMode: boolean;
    topDomain: any;
    chartData: any[];
    filteredCatalog: Opportunity[];
    isTierLocked: (item: Opportunity) => boolean;
    setSelectedItem: (item: Opportunity) => void;
    handleEnrollClick: (item: Opportunity) => void;
    handleAdd: (item: Opportunity, justification?: string) => Promise<boolean>;
    isProfileReady: boolean;
}

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

export function DashboardTab({
    profile, activeTab, setActiveTab, focusMode,
    topDomain, chartData, filteredCatalog,
    isTierLocked, setSelectedItem, handleEnrollClick,
    handleAdd, isProfileReady
}: DashboardTabProps) {
    // Evaluate the student's highest domain to define the radar's shape boundary
    const maxScore = Math.max(1, ...chartData.map(d => d.Total || 0));

    // Mastery Points logic: Tier 1 = 10pts, Tier 2 = 30pts, Tier 3 = 60pts (1:3:6 ratio)
    const getPoints = (tier: number) => tier === 3 ? 60 : tier === 2 ? 30 : 10;
    const totalPoints = profile.completed.reduce((a, c) => a + getPoints(c.tier), 0);

    // Chart.js Data Configuration
    const polarData = {
        labels: chartData.map(d => d.subject),
        datasets: [{
            label: 'Total Competency',
            data: chartData.map(d => d.Total),
            backgroundColor: 'rgba(1, 81, 177, 0.3)', // Using the brand secondary blue with opacity
            borderColor: '#0151B1',
            borderWidth: 2,
        }],
    };

    // Chart.js Display Options
    const polarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                min: 0,
                max: maxScore,
                ticks: { display: false },
                pointLabels: {
                    display: true,
                    centerPointLabels: true,
                    font: {
                        family: "'Fira Sans', sans-serif",
                        size: 10,
                        weight: 700 as const,
                    },
                    color: '#64748b', // text-slate-500
                },
            },
        },
        plugins: {
            legend: { display: false },
        },
    };

    return (
        <div className={cn("flex-1 overflow-y-auto w-full px-4 md:px-0 py-6 md:py-12 no-scrollbar", activeTab === 0 ? "block" : "hidden")}>
            <section className="bg-primary text-white rounded-xl p-6 md:px-12 md:py-10 mb-6 md:mb-8 relative overflow-hidden flex flex-col md:flex-row justify-between items-center z-10 shadow-2xl shadow-primary/20 border border-white/5">
                <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>

                <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                    <div className="max-w-xl">
                        <h1 className="font-display font-black text-2xl md:text-5xl mb-3 md:mb-4 tracking-tighter">
                            Welcome back, {profile.studentName.split(' ')[0]}.
                        </h1>
                        <p className="text-sm md:text-lg text-blue-100/80 font-medium leading-relaxed max-w-lg">
                            You have <span className="text-white font-bold">{profile.planned.length} upcoming activities</span> and a new achievement badge waiting to be claimed.
                        </p>
                    </div>

                    <div className="flex items-center justify-between w-full md:w-auto bg-white/5 p-5 md:px-10 md:py-8 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl shrink-0">
                        <div className="flex gap-10 mr-10">
                            <div>
                                <div className="text-[9px] md:text-[10px] font-black text-blue-300 tracking-[0.2em] mb-2 uppercase opacity-70">Completed</div>
                                <div className="text-3xl md:text-4xl font-display font-black">{profile.completed.length}</div>
                            </div>
                            <div>
                                <div className="text-[9px] md:text-[10px] font-black text-blue-300 tracking-[0.2em] mb-2 uppercase opacity-70">Planned</div>
                                <div className="text-3xl md:text-4xl font-display font-black">{profile.planned.length}</div>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab(2)} className="bg-white text-primary hover:bg-blue-50 px-6 md:px-8 py-3 md:py-4 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                            View Schedule
                        </button>
                    </div>
                </div>
            </section>

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
                    <section className="pro-card p-8 flex flex-col h-full bg-white">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="font-display font-black text-xl text-primary tracking-tight">Competency Profile</h2>
                            <button onClick={() => setActiveTab(3)} className="hidden md:flex items-center gap-1 text-[11px] font-black text-secondary hover:text-primary transition-colors uppercase tracking-widest">
                                Explorer <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[250px] md:min-h-[300px]">
                            <div className="w-full h-[250px] md:h-[300px] relative z-10">
                                <PolarArea data={polarData} options={polarOptions} />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-center mt-6 md:mt-8 pt-6 border-t border-outline-variant/30">
                            {topDomain && (topDomain.Completed > 2 || (topDomain.Planned || 0) > 4) ? (
                                <>
                                    <span className="bg-secondary/10 text-secondary text-[10px] font-black px-4 py-2 rounded-lg border border-secondary/20 flex items-center shadow-sm uppercase tracking-widest">
                                        <Star className="w-3.5 h-3.5 mr-1.5 fill-secondary" /> {topDomain.subject}
                                    </span>
                                    <span className="bg-surface-dim text-on-surface-variant text-[10px] font-black px-4 py-2 rounded-lg border border-outline-variant uppercase tracking-widest">
                                        {topDomain.Completed + (topDomain.Planned || 0) - 6 > 0 ? (topDomain.Completed + (topDomain.Planned || 0) - 6) * 10 : 0} Mastery Points
                                    </span>
                                </>
                            ) : (
                                <span className="bg-surface-dim text-on-surface-variant text-[10px] font-bold px-4 py-2 rounded-lg border border-outline-variant opacity-60">
                                    No competency data available yet.
                                </span>
                            )}
                        </div>
                    </section>

                    <section className="pro-card p-8 flex flex-col h-full bg-white">
                        {/* ... Master Progression Content preserved exactly ... */}
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="font-display font-black text-xl text-primary tracking-tight">Mastery Progression</h2>
                            <span className="bg-success/10 text-success text-[10px] font-black px-4 py-2 rounded-lg border border-success/20 flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                                <Star className="w-3.5 h-3.5 fill-success" />
                                {totalPoints} pts
                            </span>
                        </div>
                        <p className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em] mb-10 opacity-60">Status: Advanced Tier</p>

                        <div className="mb-8">
                            <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">
                                <span>Current Stage</span>
                                <span>Elite (3,000 pts)</span>
                            </div>
                            <div className="w-full h-2.5 bg-surface-dim rounded-full overflow-hidden border border-outline-variant/30 p-0.5">
                                <div className="h-full bg-success rounded-full shadow-lg shadow-success/20 transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(5, totalPoints / 30))}%` }}></div>
                            </div>
                            <p className="text-[10px] font-bold text-outline mt-3 text-right tabular-nums">{Math.max(0, 3000 - totalPoints)} PTS TO ELITE</p>
                        </div>

                        <div className="flex gap-4 mb-8">
                            <div className="bg-surface-dim p-5 flex-1 flex flex-col items-center justify-center rounded-xl border border-outline-variant/30">
                                <span className="text-[10px] font-black text-outline tracking-widest mb-1.5 uppercase">Tier 1</span>
                                <span className="text-2xl font-display font-black text-primary tabular-nums">{profile.completed.reduce((a, c) => a + (c.tier === 1 ? 10 : 0), 0) || 0}</span>
                            </div>
                            <div className="bg-surface-dim p-5 flex-1 flex flex-col items-center justify-center rounded-xl border border-outline-variant/30">
                                <span className="text-[10px] font-black text-outline tracking-widest mb-1.5 uppercase">Tier 2</span>
                                <span className="text-2xl font-display font-black text-primary tabular-nums">{profile.completed.reduce((a, c) => a + (c.tier === 2 ? 30 : 0), 0) || 0}</span>
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
                                            <span className="shrink-0 text-success bg-success/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-success/20">+{getPoints(c.tier)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <section className={cn("bg-transparent md:bg-white md:border md:border-slate-200 md:rounded-xl md:p-6 md:shadow-sm w-full flex flex-col", focusMode && "hidden")}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-display font-bold text-xl text-slate-900">Suggested Courses</h2>
                        <button className="text-sm font-bold text-[#0151B1] hover:text-blue-700 transition-colors" onClick={() => setActiveTab(1)}>View All</button>
                    </div>

                    <div className="flex overflow-x-auto gap-4 pb-4 -mx-margin-mobile px-margin-mobile md:mx-0 md:px-0 scrollbar-hide snap-x snap-mandatory">
                        {filteredCatalog.slice(0, 4).map((item, idx) => {
                            const isLocked = isTierLocked(item);
                            return (
                                <div key={item.id} onClick={() => setSelectedItem(item)} className="min-w-[280px] w-[280px] border border-slate-200 bg-white rounded-3xl flex flex-col overflow-hidden cursor-pointer hover:border-blue-300 hover:shadow-md transition-all shrink-0 snap-start">
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
                                        <h3 className="font-display font-bold text-lg text-slate-900 mb-2 leading-tight line-clamp-2">{item.name}</h3>
                                        <p className="text-[13px] text-slate-500 font-medium mb-6 flex-grow line-clamp-2 leading-relaxed">{item.description || 'Master core concepts and practical applications.'}</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isProfileReady && !isLocked && !profile.planned.some(p => p.opportunityId === item.id) && !profile.pending.some(p => p.opportunityId === item.id)) {
                                                    // Tier 1 & 2 items can be added directly without justification
                                                    item.tier < 3 ? handleAdd(item) : handleEnrollClick(item);
                                                }
                                            }}
                                            disabled={!isProfileReady || isLocked || profile.planned.some(p => p.opportunityId === item.id) || profile.pending.some(p => p.opportunityId === item.id)}
                                            className={cn("w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors", !isProfileReady || isLocked || profile.planned.some(p => p.opportunityId === item.id) || profile.pending.some(p => p.opportunityId === item.id) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#0151B1] text-white hover:bg-blue-700 shadow-md shadow-blue-500/20", profile.planned.some(p => p.opportunityId === item.id) ? "bg-emerald-50 text-emerald-600 shadow-none" : profile.pending.some(p => p.opportunityId === item.id) ? "bg-amber-50 text-amber-600 shadow-none" : "")}>
                                            {!isProfileReady ? 'Syncing...' : isLocked ? 'Locked' : profile.planned.some(p => p.opportunityId === item.id) ? 'Enrolled' : profile.pending.some(p => p.opportunityId === item.id) ? 'Pending' : 'Quick Enroll'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </div>
    );
}
