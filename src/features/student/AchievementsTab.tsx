import React from 'react';
import { Star, CheckCircle2 } from 'lucide-react';
import { cn, getTierName } from '../../utils';
import { Profile } from '../../types';

interface AchievementsTabProps {
    profile: Profile;
    activeTab: number;
}

export function AchievementsTab({ profile, activeTab }: AchievementsTabProps) {
    return (
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
    );
}