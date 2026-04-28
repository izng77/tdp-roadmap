import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, CheckCircle, X, BookOpen } from 'lucide-react';
import { Opportunity, Profile } from '../types';
import { cn } from '../utils';

interface SortablePlannedItemProps {
  item: Opportunity;
  profile: Profile;
  setConfirmCompleteItem: (item: Opportunity) => void;
  onRemove: (id: string) => void;
  idx: number;
}

export const SortablePlannedItem: React.FC<SortablePlannedItemProps> = ({ item, profile, setConfirmCompleteItem, onRemove, idx }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, ...(isDragging ? { zIndex: 10, position: 'relative' as any } : {}) };

  // Safely calculate progress using item and profile data
  const isCompletionPending = (item as any).status === 'completion_pending';
  const profileProgress = (profile as any).courseProgress?.[item.id] || (profile as any).progress?.[item.id];
  const progress = isCompletionPending ? 100 : (profileProgress || (item as any).progress || 0);

  const getIcon = () => {
    if (item.domain === 'STEM' || item.domain === 'STEM & Innovation') return <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-serif text-lg italic shrink-0">fx</div>;
    if (item.domain === 'Humanities' || item.domain === 'Leadership & Service') return <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></div>;
    return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all group shadow-sm",
        isDragging ? "shadow-xl scale-[1.02] border-blue-300 z-10" : "hover:border-blue-200 hover:shadow-md hover:translate-y-[-2px]"
      )}
    >
      {/* Top Section: Identity */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div {...listeners} {...attributes} className="cursor-move text-slate-300 hover:text-slate-500 active:cursor-grabbing p-2 -ml-2 shrink-0 touch-none">
          <GripVertical className="w-5 h-5" />
        </div>

        {getIcon()}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-display font-bold text-slate-900 text-sm sm:text-base truncate">{item.name}</div>
            {(item as any).status === 'completion_pending' && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200 shrink-0">Verification Pending</span>
            )}
          </div>
          <div className="text-xs font-medium text-slate-500 flex items-center gap-2 truncate">
            <span className="flex items-center gap-1 shrink-0"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Mon, Wed 10:00 AM</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0"></span>
            <span className="truncate">Prof. Harrison</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Progress & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
        <div className="flex flex-col gap-1.5 w-full max-w-[140px] sm:w-32 shrink-0">
          <div className="flex justify-between items-center w-full">
            <span className="text-[10px] font-bold tracking-widest uppercase text-slate-900">Progress</span>
            <span className="text-[10px] font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {(item as any).status !== 'completion_pending' && (
            <button
              onClick={() => setConfirmCompleteItem(item)}
              className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors active:scale-95"
              title="Request Completion"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors active:scale-95"
            title="Remove from planned"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
