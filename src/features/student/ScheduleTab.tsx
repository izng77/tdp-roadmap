import React from 'react';
import { Clock, X, Calendar } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortablePlannedItem } from '../../components/SortablePlannedItem';
import { cn } from '../../utils';
import { Profile, Opportunity } from '../../types';

interface ScheduleTabProps {
    profile: Profile;
    activeTab: number;
    setActiveTab: (val: number) => void;
    handleRemoveItem: (id: string) => Promise<boolean>;
    handleDragEnd: (event: any) => Promise<void>;
    setConfirmCompleteItem: (item: Opportunity) => void;
}

export function ScheduleTab({
    profile, activeTab, setActiveTab,
    handleRemoveItem, handleDragEnd, setConfirmCompleteItem
}: ScheduleTabProps) {
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    return (
        <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar animate-fadeIn", activeTab === 2 ? "block" : "hidden")}>
            <section className="mb-section-gap px-margin-mobile md:px-0 max-w-3xl">
                <h2 className="font-display-xl text-display-xl text-on-surface mb-stack-sm">My Schedule</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Manage your planned academic activities and track upcoming deadlines.</p>

                {profile.pending.length > 0 && (
                    <div className="mb-8">
                        <h2 className="font-display font-bold text-xl text-slate-800 mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Pending Requests ({profile.pending.length})
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
                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mt-1">{(item as any).status === 'drop_pending' ? 'Drop Requested' : 'Waiting for teacher approval'}</p>
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
    );
}