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

export const SortablePlannedItem: React.FC<SortablePlannedItemProps> = ({ item, setConfirmCompleteItem, onRemove, idx }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, ...(isDragging ? { zIndex: 10, position: 'relative' as any } : {}) };

  const getIcon = () => {
    if (item.domain === 'STEM' || item.domain === 'STEM & Innovation') return <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-serif text-lg italic shrink-0">fx</div>;
    if (item.domain === 'Humanities' || item.domain === 'Leadership & Service') return <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5"/></div>;
    return <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>;
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "p-5 rounded-2xl bg-white border border-slate-200 flex items-center gap-4 transition-all group shadow-sm",
        isDragging ? "shadow-xl scale-[1.02] border-blue-300" : "hover:border-blue-200 hover:shadow-md"
      )}
    >
      <div {...listeners} {...attributes} className="cursor-move text-slate-300 hover:text-slate-500 active:cursor-grabbing p-1 shrink-0">
         <GripVertical className="w-5 h-5"/>
      </div>
      
      {getIcon()}

      <div className="flex-1 min-w-0 pr-2">
         <div className="font-display font-bold text-slate-900 text-base mb-1 truncate">{item.name}</div>
         <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
            <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Mon, Wed 10:00 AM</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>Prof. Harrison</span>
         </div>
      </div>
      
      <div className="flex flex-col items-end gap-2 pr-4 w-32 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-900">Progress</span>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
           <div className="h-full bg-blue-600 rounded-full" style={{width: '60%'}}></div>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setConfirmCompleteItem(item)} 
          className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors"
          title="Mark as completed"
        >
          <CheckCircle className="w-4 h-4"/>
        </button>
        <button 
          onClick={() => onRemove(item.id)} 
          className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-colors"
          title="Remove from planned"
        >
          <X className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
};

