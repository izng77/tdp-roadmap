import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Bell, 
  TrendingUp, 
  Settings, 
  Shield, 
  Calendar, 
  Star, 
  Clock, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  Heart, 
  Upload, 
  Lock,
  ShieldCheck,
  MoreHorizontal,
  Edit,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  serverTimestamp 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from 'recharts';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';

import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { useRoadmapData } from './hooks/useRoadmapData';
import { Opportunity, Profile } from './types';
import { cn, getTierName } from './utils';

import { TopNavBar, SideNavBar, BottomNavBar, DesktopTopBar } from './components/Navigation';
import { PendingUserRequests } from './components/PendingUserRequests';
import { SortablePlannedItem } from './components/SortablePlannedItem';

function MainApp({ user }: { user: User }) {
  const { profile, setProfile, catalog, setCatalog, isAdminUser, allUsers } = useRoadmapData(user);
  const [activeTab, setActiveTab] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<Opportunity | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'err'} | null>(null);
  const [domainFilters, setDomainFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [levelFilter, setLevelFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Opportunity | null>(null);
  const [directEnrollId, setDirectEnrollId] = useState<string | null>(null);
  const [enrollJustification, setEnrollJustification] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  
  // Teacher Console States
  const [teacherSearch, setTeacherSearch] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Opportunity> | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalForm, setExternalForm] = useState({ name: '', domain: '', tier: 1, justification: '' });
  const [showSaintsImport, setShowSaintsImport] = useState(false);
  const [saintsPortalText, setSaintsPortalText] = useState('');
  const [saintsPortalParsed, setSaintsPortalParsed] = useState<Opportunity[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showNotification = (msg: string, type: 'success' | 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isTierLocked = (item: Opportunity) => {
    if (item.tier === 1) return false;
    const hasLowerTierInDomain = profile.completed.some(c => c.domain === item.domain && c.tier < item.tier) || 
                                profile.planned.some(p => p.domain === item.domain && p.tier < item.tier);
    return !hasLowerTierInDomain;
  };

  const getLockReason = (item: Opportunity) => {
    if (item.tier === 1) return "";
    return `Requires a Tier ${item.tier - 1} or lower course in ${item.domain}`;
  };

  const getUnlockSuggestions = (item: Opportunity) => {
    return catalog.filter(c => c.domain === item.domain && c.tier < item.tier).slice(0, 2);
  };

  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.domain.toLowerCase().includes(search.toLowerCase());
      const matchesDomain = domainFilters.length === 0 || domainFilters.includes(item.domain.toLowerCase());
      const matchesLevel = levelFilter === 'all' || item.level === levelFilter;
      const matchesTerm = termFilter === 'all' || item.term === termFilter;
      const matchesWeek = weekFilter === 'all' || item.week === weekFilter;
      const matchesTier = tierFilter === 'all' || item.tier === Number(tierFilter);
      const matchesBookmark = !showBookmarksOnly || profile.bookmarks.some(b => b.id === item.id);
      const isVisible = !item.isUnlisted || isAdminUser;
      
      return matchesSearch && matchesDomain && matchesLevel && matchesTerm && matchesWeek && matchesTier && matchesBookmark && isVisible;
    });
  }, [catalog, search, domainFilters, levelFilter, termFilter, weekFilter, tierFilter, showBookmarksOnly, profile.bookmarks, isAdminUser]);

  const chartData = useMemo(() => {
    const domains = Array.from(new Set(catalog.map(item => item.domain)));
    return domains.map(domain => {
      const completedCount = profile.completed.filter(c => c.domain === domain).length;
      const plannedCount = profile.planned.filter(p => p.domain === domain).length;
      return {
        subject: domain,
        Completed: completedCount * 5 + 2, // Base scale for visualization
        Planned: (completedCount + plannedCount) * 5 + 2,
        fullMark: 20
      };
    });
  }, [catalog, profile.completed, profile.planned]);

  const topDomain = useMemo(() => {
    if (chartData.length === 0) return null;
    return [...chartData].sort((a, b) => b.Completed - a.Completed)[0];
  }, [chartData]);

  const filterOptions = useMemo(() => {
    return {
      levels: Array.from(new Set(catalog.map(i => i.level).filter(Boolean))) as string[],
      terms: Array.from(new Set(catalog.map(i => i.term).filter(Boolean))) as string[],
      weeks: Array.from(new Set(catalog.map(i => i.week).filter(Boolean))) as string[]
    };
  }, [catalog]);

  const handleEnrollClick = async (item: Opportunity) => {
    if (isTierLocked(item)) {
      showNotification(getLockReason(item), 'err');
      return;
    }

    if (profile.planned.some(p => p.id === item.id)) {
      showNotification('Already in your schedule', 'success');
      return;
    }

    if (profile.pending.some(p => p.id === item.id)) {
      showNotification('Enrollment request is pending approval', 'success');
      return;
    }

    if (directEnrollId !== item.id) {
      setDirectEnrollId(item.id);
      setSelectedItem(item);
      setEnrollJustification('');
      return;
    }

    if (!enrollJustification.trim()) {
      showNotification('Please provide a statement of interest.', 'err');
      return;
    }

    try {
      const isMock = user.uid.startsWith('mock_');
      if (!isMock) {
        const newCourseRef = doc(collection(db, 'users', user.uid, 'courses'));
        await setDoc(newCourseRef, {
          opportunityId: item.id,
          status: 'pending',
          order: profile.planned.length + profile.pending.length,
          addedAt: serverTimestamp(),
          justification: enrollJustification.trim(),
          name: item.name,
          tier: item.tier,
          domain: item.domain
        });
      } else {
        // Simulated add for mock user
        const mockPending = { ...item, status: 'pending', justification: enrollJustification };
        setProfile(prev => ({
          ...prev,
          pending: [...prev.pending, mockPending as Opportunity]
        }));
      }
      
      showNotification(`Request sent for ${item.name}!`, 'success');
      setSelectedItem(null);
      setDirectEnrollId(null);
      setEnrollJustification('');
    } catch (e) {
      console.error("Enroll Error:", e);
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/courses`);
    }
  };

  const handleToggleBookmark = async (item: Opportunity) => {
    const isBookmarked = profile.bookmarks.some(b => b.id === item.id);
    try {
      const isMock = user.uid.startsWith('mock_');
      if (!isMock) {
        const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', item.id);
        if (isBookmarked) {
          await deleteDoc(bookmarkRef);
        } else {
          await setDoc(bookmarkRef, {
            id: item.id,
            addedAt: serverTimestamp()
          });
        }
      } else {
        // Simulated toggle for mock user
        setProfile(prev => ({
          ...prev,
          bookmarks: isBookmarked 
            ? prev.bookmarks.filter(b => b.id !== item.id)
            : [...prev.bookmarks, item]
        }));
      }
      showNotification(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks', 'success');
    } catch (e) {
      handleFirestoreError(e, isBookmarked ? OperationType.DELETE : OperationType.CREATE, `users/${user.uid}/bookmarks/${item.id}`);
    }
  };

  const handleRemoveItem = async (id: string) => {
    try {
      const isMock = user.uid.startsWith('mock_');
      const itemToRemove = profile.planned.find(p => p.id === id) || profile.pending.find(p => p.id === id) || profile.rejected.find(r => r.id === id);
      
      if (!isMock) {
        // In real Firestore, we need the doc ID. useRoadmapData should've mapped these.
        // Assuming the ID stored in planned/pending/rejected is the Firestore document ID
        await deleteDoc(doc(db, 'users', user.uid, 'courses', id));
        
        // If it was a planned item, decrement enrolled count
        if (profile.planned.some(p => p.id === id)) {
           const oppId = itemToRemove?.courseId || itemToRemove?.id;
           if (oppId) {
             const oppRef = doc(db, 'opportunities', oppId);
             // We'd need to fetch or use a transaction here, but for prototype:
             // updateDoc(oppRef, { enrolled: increment(-1) });
           }
        }
      } else {
        // Simulated remove for mock user
        setProfile(prev => ({
          ...prev,
          planned: prev.planned.filter(p => p.id !== id),
          pending: prev.pending.filter(p => p.id !== id),
          rejected: prev.rejected.filter(p => p.id !== id)
        }));
      }
      showNotification('Activity removed', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/courses/${id}`);
    }
  };

  const handleCompleteCourse = async (item: Opportunity) => {
    try {
      const isMock = user.uid.startsWith('mock_');
      if (!isMock) {
        await updateDoc(doc(db, 'users', user.uid, 'courses', item.id), {
          status: 'completed',
          completedAt: serverTimestamp()
        });
      } else {
        // Simulated complete for mock user
        setProfile(prev => ({
          ...prev,
          planned: prev.planned.filter(p => p.id !== item.id),
          completed: [...prev.completed, { ...item, status: 'completed' } as Opportunity]
        }));
      }
      setConfirmCompleteItem(null);
      showNotification(`Congratulations on completing ${item.name}!`, 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/courses/${item.id}`);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = profile.planned.findIndex(p => p.id === active.id);
      const newIndex = profile.planned.findIndex(p => p.id === over.id);
      const newPlanned = arrayMove(profile.planned, oldIndex, newIndex);
      
      setProfile(prev => ({ ...prev, planned: newPlanned }));
      
      // Sync to Firestore
      try {
        const isMock = user.uid.startsWith('mock_');
        if (!isMock) {
          const batch = writeBatch(db);
          newPlanned.forEach((item, idx) => {
            batch.update(doc(db, 'users', user.uid, 'courses', item.id), { order: idx });
          });
          await batch.commit();
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/courses`);
      }
    }
  };

  const autoParseSaintsPortalData = () => {
    const lines = saintsPortalText.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    if (lines.length === 0) return;

    const detected: Opportunity[] = lines.map(line => {
      const lower = line.toLowerCase();
      let domain = "Cognitive & Academic";
      let tier = 1;

      if (lower.includes('olympiad') || lower.includes('competition') || lower.includes('prize') || lower.includes('award') || lower.includes('h3')) tier = 3;
      else if (lower.includes('council') || lower.includes('exco') || lower.includes('leader') || lower.includes('captain') || lower.includes('president') || lower.includes('secretary')) tier = 2;

      if (lower.includes('math') || lower.includes('science') || lower.includes('computing') || lower.includes('ict') || lower.includes('stem') || lower.includes('robotics')) domain = "STEM & Innovation";
      else if (lower.includes('art') || lower.includes('music') || lower.includes('theatre') || lower.includes('dance') || lower.includes('choir') || lower.includes('band')) domain = "Aesthetics & Culture";
      else if (lower.includes('council') || lower.includes('service') || lower.includes('volunteer') || lower.includes('community') || lower.includes('via')) domain = "Leadership & Service";
      else if (lower.includes('sport') || lower.includes('basketball') || lower.includes('football') || lower.includes('track') || lower.includes('badminton')) domain = "Physical & Sports";
      
      return {
        id: `portal_${Math.random().toString(36).substr(2, 9)}`,
        name: line,
        domain,
        tier,
        description: "Imported from Saints Portal",
        level: "JC1 & JC2"
      } as Opportunity;
    });

    setSaintsPortalParsed(detected);
    showNotification(`Detected ${detected.length} activities. Review them below.`, 'success');
  };

  if (showAdminPanel && isAdminUser) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F1F5F9] font-body-sm text-slate-900 selection:bg-blue-100">
        <TopNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
        <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
        
        <main className="flex-1 md:ml-[88px] flex flex-col min-w-0 pb-32">
          <div className="w-full h-20 bg-white border-b border-slate-200 flex items-center px-10 sticky top-0 z-30">
             <div className="flex-1">
               <h1 className="font-display font-extrabold text-2xl text-[#1A365D] tracking-tight">Teacher Console</h1>
             </div>
             <div className="flex items-center gap-4">
                <div className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-bold border border-emerald-100">Authenticated: {user.email}</div>
             </div>
          </div>

          <div className="max-w-[1400px] w-full mx-auto p-10">
            {/* Overview Stats */}
            <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-6 mb-10", activeTab !== 0 && "hidden")}>
               {[
                 { label: 'Total Students', value: allUsers.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
                 { label: 'Active Requests', value: allUsers.reduce((acc, u) => acc + (u.pending?.length || 0), 0), icon: Bell, color: 'text-amber-600', bg: 'bg-amber-100' },
                 { label: 'Courses Offered', value: catalog.length, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-100' },
                 { label: 'Avg Mastery Pts', value: Math.round(allUsers.reduce((acc, u) => acc + (u.totalTierPoints || 0), 0) / (allUsers.length || 1)), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' }
               ].map((stat, i) => (
                 <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                      <stat.icon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</div>
                      <div className="text-3xl font-display font-bold text-slate-900">{stat.value}</div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
               {/* Tab 0: Admin Overview / Student List */}
               <div className={cn(activeTab === 0 ? "block" : "hidden")}>
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-display font-bold text-xl text-[#1A365D]">Student Progress Tracking</h2>
                    <div className="relative w-72">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search students..." 
                        value={teacherSearch}
                        onChange={e => setTeacherSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-5 px-8">Student Name</th>
                          <th className="py-5 px-4 text-center">T1</th>
                          <th className="py-5 px-4 text-center">T2</th>
                          <th className="py-5 px-4 text-center">T3</th>
                          <th className="py-5 px-4 text-center">Total Pts</th>
                          <th className="py-5 px-8 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allUsers.filter(u => u.studentName?.toLowerCase().includes(teacherSearch.toLowerCase())).map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-5 px-8">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                                  {student.studentName?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-900">{student.studentName}</span>
                                  <span className="text-xs text-slate-500">{student.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center font-bold text-slate-700">{student.tier1Count || 0}</td>
                            <td className="py-5 px-4 text-center font-bold text-slate-700">{student.tier2Count || 0}</td>
                            <td className="py-5 px-4 text-center font-bold text-slate-700">{student.tier3Count || 0}</td>
                            <td className="py-5 px-4 text-center">
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                                {student.totalTierPoints || 0}
                              </span>
                            </td>
                            <td className="py-5 px-8 text-right">
                              <button className="text-slate-400 hover:text-blue-600 p-2 transition-colors">
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               {/* Tab 1: Catalog Management */}
               <div className={cn(activeTab === 1 ? "block" : "hidden")}>
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-display font-bold text-xl text-[#1A365D]">Catalog Management</h2>
                    <div className="flex gap-4">
                      <div className="relative w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Search courses..." 
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                      <button 
                        onClick={() => {
                          const newId = `course_${Date.now()}`;
                          const newCourse = {
                            id: newId,
                            name: 'New Course Template',
                            domain: 'Cognitive & Academic',
                            tier: 1,
                            description: 'Add course description here...',
                            level: 'JC1 & JC2',
                            enrolled: 0,
                            capacity: 20
                          };
                          setEditingCourseId(newId);
                          setEditingCourseData(newCourse);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Course
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-5 px-8 w-1/3">Course Title</th>
                          <th className="py-5 px-4 text-center">Tier</th>
                          <th className="py-5 px-4">Domain</th>
                          <th className="py-5 px-4 text-center">Enrollment</th>
                          <th className="py-5 px-8 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCatalog.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="py-5 px-8">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 relative group/img">
                                  {item.image ? (
                                    <img src={item.image} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <ImageIcon className="w-6 h-6" />
                                    </div>
                                  )}
                                  <button onClick={() => { setEditingImageId(item.id); setEditedImageUrl(item.image || ''); }} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-900 truncate">{item.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.level}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", item.tier === 1 ? "bg-emerald-100 text-emerald-700" : item.tier === 2 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700")}>
                                {getTierName(item.tier)}
                              </span>
                            </td>
                            <td className="py-5 px-4">
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {item.domain}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-bold text-slate-900">{item.enrolled || 0}/{item.capacity || 20}</span>
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((item.enrolled || 0) / (item.capacity || 20)) * 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-8 text-right">
                               <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => { setEditingCourseId(item.id); setEditingCourseData({ ...item }); }}
                                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                  >
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                                        try {
                                          const isMock = user.uid.startsWith('mock_');
                                          if (!isMock) { await deleteDoc(doc(db, 'opportunities', item.id)); }
                                          else { setCatalog(catalog.filter(o => o.id !== item.id)); }
                                          showNotification('Course deleted successfully', 'success');
                                        } catch (e) { handleFirestoreError(e, OperationType.DELETE, `opportunities/${item.id}`); }
                                      }
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
               </div>

               {/* Tab 3: Requests Panel */}
               <div className={cn(activeTab === 3 ? "block" : "hidden")}>
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-display font-bold text-xl text-[#1A365D]">Enrollment Requests</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                          <th className="py-5 px-8">Student</th>
                          <th className="py-5 px-4">Learning Opportunity</th>
                          <th className="py-5 px-8 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allUsers.map((studentUser) => (
                          <PendingUserRequests 
                            key={studentUser.id} 
                            userDoc={studentUser} 
                            catalog={catalog} 
                            showNotification={showNotification}
                            mockPending={studentUser.pending}
                            mockProcessed={studentUser.processed}
                            onMockAction={(courseId, action) => {
                              // If it's the mock user, we update their local state
                              if (studentUser.id === 'mock_student_123') {
                                const target = [...(studentUser.pending || []), ...(studentUser.processed || [])].find(c => c.id === courseId);
                                if (!target) return;
                                
                                setProfile(prev => {
                                  const pending = [...prev.pending];
                                  const planned = [...prev.planned];
                                  const rejected = [...prev.rejected];
                                  
                                  if (action === 'approve') {
                                    const pIdx = pending.findIndex(p => p.id === courseId);
                                    if (pIdx > -1) {
                                      const item = pending.splice(pIdx, 1)[0];
                                      planned.push({ ...item, status: 'planned' });
                                    }
                                  } else if (action === 'reject') {
                                    const pIdx = pending.findIndex(p => p.id === courseId);
                                    if (pIdx > -1) {
                                      const item = pending.splice(pIdx, 1)[0];
                                      rejected.push({ ...item, status: 'rejected' });
                                    }
                                  } else if (action === 'undo') {
                                    const plIdx = planned.findIndex(p => p.id === courseId);
                                    if (plIdx > -1) {
                                      const item = planned.splice(plIdx, 1)[0];
                                      pending.push({ ...item, status: 'pending' });
                                    } else {
                                      const rIdx = rejected.findIndex(r => r.id === courseId);
                                      if (rIdx > -1) {
                                        const item = rejected.splice(rIdx, 1)[0];
                                        pending.push({ ...item, status: 'pending' });
                                      }
                                    }
                                  }
                                  
                                  return { ...prev, pending, planned, rejected };
                                });
                              }
                            }}
                          />
                        ))}
                        {allUsers.every(u => (u.pending?.length || 0) === 0 && (u.processed?.length || 0) === 0) && (
                          <tr>
                            <td colSpan={3} className="py-20 text-center text-slate-400 font-medium italic">No active or recently processed requests.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </div>

          {/* Edit Course Modal */}
          {editingCourseId && editingCourseData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-2xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] custom-scrollbar">
                <button 
                  onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} 
                  className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                   <X className="w-6 h-6"/>
                </button>
                <h2 className="text-2xl font-display font-bold text-[#1A365D] mb-8">Course Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Course Title</label>
                    <input 
                      type="text" 
                      value={editingCourseData.name} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, name: e.target.value })} 
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Domain</label>
                    <select 
                      value={editingCourseData.domain} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, domain: e.target.value })} 
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                    >
                      {Array.from(new Set(catalog.map(i => i.domain))).map(d => <option key={d} value={d}>{d}</option>)}
                      <option value="New Domain...">+ Add New Domain</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Tier Level</label>
                    <select 
                      value={editingCourseData.tier} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, tier: Number(e.target.value) })} 
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-all"
                    >
                      <option value={1}>Tier 1 (Awareness)</option>
                      <option value={2}>Tier 2 (Develop)</option>
                      <option value={3}>Tier 3 (Deepen)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Level / Cohort</label>
                    <input 
                      type="text" 
                      value={editingCourseData.level || ''} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, level: e.target.value })} 
                      placeholder="e.g. JC1 & JC2"
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max Capacity</label>
                    <input 
                      type="number" 
                      value={editingCourseData.capacity || 20} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, capacity: Number(e.target.value) })} 
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                    <textarea 
                      value={editingCourseData.description || ''} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, description: e.target.value })} 
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Teacher Emails (Internal Only)</label>
                    <input 
                      type="text" 
                      value={editingCourseData.ownerEmails?.join(', ') || ''} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, ownerEmails: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                      placeholder="teacher1@sajc.edu.sg, teacher2@sajc.edu.sg"
                      className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 mb-4">
                    <input 
                      type="checkbox" 
                      id="is-unlisted"
                      checked={editingCourseData.isUnlisted || false} 
                      onChange={(e) => setEditingCourseData({ ...editingCourseData, isUnlisted: e.target.checked })} 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is-unlisted" className="text-sm font-bold text-slate-700 cursor-pointer">Unlisted (Visible only to teachers and via direct link)</label>
                  </div>
                  
                  <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                    <button 
                      onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} 
                      className="px-6 py-2.5 rounded-full text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          if (editingCourseData.ownerEmails?.some(em => !em.endsWith('@sajc.edu.sg'))) {
                            showNotification('All assigned teacher emails must end with @sajc.edu.sg', 'err');
                            return;
                          }
                          
                          const isMock = user.uid.startsWith('mock_');
                          if (!isMock) {
                            const b = writeBatch(db);
                            const cleanData = { ...editingCourseData };
                            if (cleanData.enrolled === undefined) cleanData.enrolled = 0;
                            delete (cleanData as any).id;
                            b.set(doc(db, 'opportunities', editingCourseId as string), cleanData, { merge: true });
                            await b.commit();
                          } else {
                            // Simulated save for mock user
                            const updatedCatalog = catalog.map(item => 
                              item.id === editingCourseId ? { ...editingCourseData, id: editingCourseId } as Opportunity : item
                            );
                            setCatalog(updatedCatalog);
                          }
                          
                          showNotification(isMock ? 'Simulated: Changes saved locally.' : 'Course details updated successfully', 'success');
                          setEditingCourseId(null);
                          setEditingCourseData(null);
                        } catch (e) {
                          console.error("Save Changes Error:", e);
                          handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                        }
                      }} 
                      className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-all active:scale-95"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {editingImageId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                <button 
                  onClick={() => setEditingImageId(null)} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                   <X className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Thumbnail</h2>
                
                <div className="mb-4">
                   <label className="block text-sm font-bold text-slate-700 mb-2">Upload from computer</label>
                   <label className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                     <input 
                       type="file" 
                       accept="image/*" 
                       className="hidden" 
                       onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             const img = new Image();
                             img.onload = () => {
                               const canvas = document.createElement('canvas');
                               const MAX_WIDTH = 400;
                               const MAX_HEIGHT = 400;
                               let width = img.width;
                               let height = img.height;

                               if (width > height) {
                                 if (width > MAX_WIDTH) {
                                   height *= MAX_WIDTH / width;
                                   width = MAX_WIDTH;
                                 }
                               } else {
                                 if (height > MAX_HEIGHT) {
                                   width *= MAX_HEIGHT / height;
                                   height = MAX_HEIGHT;
                                 }
                               }
                               canvas.width = width;
                               canvas.height = height;
                               const ctx = canvas.getContext('2d');
                               ctx?.drawImage(img, 0, 0, width, height);
                               const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                               setEditedImageUrl(dataUrl);
                             };
                             img.src = event.target?.result as string;
                           };
                           reader.readAsDataURL(file);
                         }
                       }} 
                     />
                     <div className="flex flex-col items-center">
                       <Upload className="w-6 h-6 text-slate-400 mb-2" />
                       <span className="text-sm text-slate-500 font-medium">Click to select an image</span>
                     </div>
                   </label>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="h-px bg-slate-200 flex-1"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase">OR</span>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>

                <label className="block text-sm font-bold text-slate-700 mb-2">Image URL</label>
                <input 
                  type="text" 
                  value={editedImageUrl} 
                  onChange={(e) => setEditedImageUrl(e.target.value)} 
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg p-3 mb-6 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setEditingImageId(null)} 
                    className="px-5 py-2.5 rounded-full text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                      onClick={async () => {
                        try {
                          const isMock = user.uid.startsWith('mock_');
                          if (!isMock) {
                            await updateDoc(doc(db, 'opportunities', editingImageId as string), { image: editedImageUrl });
                          } else {
                            // Simulated update
                            setCatalog(catalog.map(o => o.id === editingImageId ? { ...o, image: editedImageUrl } : o));
                          }
                          showNotification('Thumbnail updated successfully', 'success');
                          setEditingImageId(null);
                        } catch (e) {
                           handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                        }
                      }} 
                      className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all"
                    >
                      Update URL
                    </button>
                </div>
              </div>
            </div>
          )}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
              <div className={cn("px-4 py-3 rounded-xl shadow-lg flex items-center gap-3", toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
                 {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <X className="w-5 h-5"/>}
                 <span className="font-medium text-sm">{toast.msg}</span>
              </div>
            </div>
          )}
          <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} showAdminPanel={showAdminPanel} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
      <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
      <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
      
      {/* Main Content */}
      <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
        <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />
        <div className="w-full max-w-[1200px] mx-auto">
        {/* Dashboard Tab */}
        <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar", activeTab === 0 ? "block" : "hidden")}>
          <section className="bg-[#1A365D] text-white rounded-[2rem] p-6 md:px-10 md:py-8 mb-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-center z-10 shadow-lg shadow-blue-900/10">
            <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-2xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="hidden md:block absolute right-12 top-10 w-64 h-64 bg-slate-900/40 rounded-[4rem] pointer-events-none transform -rotate-12"></div>
            
            <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div className="max-w-xl">
                <h1 className="font-display font-bold md:font-extrabold text-[28px] md:text-4xl mb-2 md:mb-4 tracking-tight">
                  Welcome back, {profile.studentName.split(' ')[0]}.
                </h1>
                <p className="text-[15px] md:text-lg text-blue-100 md:text-slate-300 font-medium mb-6 md:mb-0 leading-relaxed max-w-lg">
                  You have {profile.planned.length} upcoming deadlines and a new achievement badge waiting to be claimed. Keep up the excellent work.
                </p>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto bg-white/5 md:bg-white/10 p-5 md:px-8 md:py-6 rounded-2xl border border-white/10 backdrop-blur-sm shadow-xl shrink-0">
                <div className="flex gap-8 mr-6 md:mr-10">
                  <div>
                    <div className="text-[10px] font-bold text-blue-200 tracking-widest mb-1 uppercase">Completed</div>
                    <div className="text-2xl md:text-3xl font-display font-bold">{profile.completed.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-blue-200 tracking-widest mb-1 uppercase">Planned</div>
                    <div className="text-2xl md:text-3xl font-display font-bold">{profile.planned.length}</div>
                  </div>
                </div>
                <button onClick={() => setActiveTab(2)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 md:px-8 md:py-4 rounded-full text-[11px] md:text-sm font-bold uppercase tracking-wider shadow-lg shadow-blue-900/20 active:scale-95 transition-all">
                  View Schedule
                </button>
              </div>
            </div>
          </section>
          
          {/* Focus Mode TL;DR Banner */}
          {focusMode && (
            <div className="mb-6 bg-[#1A365D] text-white rounded-xl px-6 py-4 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-3 shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
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
            <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", focusMode && "hidden")}>
              {/* Competency Profile - Radar chart block */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-display font-bold text-xl text-slate-900">Competency Profile</h2>
                  <button onClick={() => setActiveTab(3)} className="md:hidden flex items-center gap-1 text-[11px] font-bold text-[#0151B1] hover:text-blue-700 transition-colors uppercase tracking-wider">
                    View Details <ChevronRight className="w-4 h-4"/>
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div className="w-full h-[200px] md:h-[220px] lg:h-[240px] relative z-10 px-0 md:px-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData} style={{ overflow: 'visible' }}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontFamily: 'Plus Jakarta Sans', fontWeight: 600, fill: '#475569', dy: 4 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 15]} tick={false} axisLine={false} />
                          <Radar name="Completed" dataKey="Completed" stroke="#3b82f6" strokeWidth={2} activeDot={{r: 6}} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} fill="#eff6ff" fillOpacity={0.8} />
                        </RadarChart>
                      </ResponsiveContainer>
                  </div>
                  
                </div>
                <div className="flex gap-2 justify-center mt-auto pt-6 border-t border-slate-50">
                  {topDomain && (topDomain.Completed > 2 || topDomain.Planned > 4) ? (
                    <>
                      <span className="bg-blue-50 text-blue-600 text-[11px] font-bold px-3 py-1 rounded-full border border-blue-100 flex items-center shadow-sm">
                        <Star className="w-3 h-3 mr-1 fill-blue-600" /> Focus: {topDomain.subject}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full border border-slate-200">
                        {topDomain.Completed + topDomain.Planned - 6 > 0 ? (topDomain.Completed + topDomain.Planned - 6) * 10 : 0} Mastery Pts
                      </span>
                    </>
                  ) : (
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full border border-slate-200 text-center">
                      Start enrolling in courses to see your competency insights
                    </span>
                  )}
                </div>
              </section>

              {/* Mastery Progression */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full justify-center">
                <div className="flex justify-between items-start mb-1">
                  <h2 className="font-display font-bold text-xl text-slate-900">Mastery Progression</h2>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-emerald-700" /> {profile.completed.reduce((a,c)=>a+c.tier, 0) * 10} pts</span>
                </div>
                <p className="text-sm font-medium text-slate-500 mb-8">Current Status: Advanced</p>
                
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                    <span>Advanced Tier</span>
                    <span>Elite Tier (3,000 pts)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{width: `${Math.min(100, Math.max(5, (profile.completed.reduce((a,c)=>a+c.tier, 0) * 10) / 30))}%`}}></div>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-2 text-right">{3000 - (profile.completed.reduce((a,c)=>a+c.tier, 0) * 10)} pts remaining to next tier</p>
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="bg-slate-50 p-3 flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-0.5 uppercase">Tier 1</span>
                    <span className="text-lg font-display font-bold text-slate-700">{profile.completed.reduce((a,c) => a + (c.tier === 1 ? 10 : 0), 0) || 450}</span>
                  </div>
                  <div className="bg-slate-50 p-3 flex-1 flex flex-col items-center justify-center rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider mb-0.5 uppercase">Tier 2</span>
                    <span className="text-lg font-display font-bold text-slate-700">{profile.completed.reduce((a,c) => a + (c.tier === 2 ? 20 : 0), 0) || 120}</span>
                  </div>
                </div>
                
                <div className="flex-1 mt-2 lg:mt-6 border-t border-slate-100 pt-4 lg:pt-6">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Recent Achievements</h3>
                  {profile.completed.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                      <p className="text-sm font-medium text-slate-500">No milestones yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile.completed.slice(-2).reverse().map((c, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 overflow-hidden">
                          <div className="min-w-0 pr-4">
                            <p className="text-[13px] font-bold text-slate-900 truncate">{c.name}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">{c.domain}</p>
                          </div>
                          <span className="shrink-0 text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-md text-[11px] font-bold">+{c.tier * 10} pts</span>
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
                           <button onClick={(e) => { e.stopPropagation(); if(!isLocked && !profile.planned.some(p => p.id === item.id) && !profile.pending.some(p => p.id === item.id)) handleEnrollClick(item); }} className={cn("w-full py-3 rounded-full text-xs font-bold uppercase tracking-wider transition-colors", isLocked ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-[#0151B1] text-white hover:bg-blue-700 shadow-md shadow-blue-500/20", profile.planned.some(p => p.id === item.id) ? "bg-emerald-50 text-emerald-600 shadow-none" : profile.pending.some(p => p.id === item.id) ? "bg-amber-50 text-amber-600 shadow-none" : "")}>
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
              <button 
                onClick={() => setDomainFilters([])}
                className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", domainFilters.length === 0 ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}
              >
                All Domains
              </button>
              
              <button 
                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm flex items-center gap-2", showBookmarksOnly ? "bg-red-50 text-red-600 border-red-200 shadow-md shadow-red-500/10" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low")}
              >
                <Heart className={cn("w-4 h-4", showBookmarksOnly ? "fill-current" : "")} />
                {showBookmarksOnly ? "Show All" : "Bookmarked Only"}
              </button>
              {Array.from(new Set(catalog.map(item => (item.domain || "General").trim()))).sort().map(d => {
                const isActive = domainFilters.includes(d.toLowerCase());
                return (
                  <button 
                    key={d}
                    onClick={() => {
                      const lowerD = d.toLowerCase();
                      if (isActive) {
                        setDomainFilters(domainFilters.filter(filter => filter !== lowerD));
                      } else {
                        setDomainFilters([...domainFilters, lowerD]);
                      }
                    }}
                    className={cn("whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold transition-all border shadow-sm", isActive ? "bg-primary text-on-primary border-primary shadow-md shadow-primary/20 scale-105" : "bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:bg-surface-container-low hover:text-on-surface")}
                  >
                    {d}
                  </button>
                );
              })}
              <div className="ml-auto flex items-center gap-2 pl-4">
                <button 
                  onClick={() => setShowFilters(!showFilters)} 
                  className={cn("flex items-center gap-2 text-sm font-bold transition-colors", showFilters ? "text-primary" : "text-slate-600 hover:text-primary")}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  Filters
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10 animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
                  <select 
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">All Levels</option>
                    {filterOptions.levels.map((l: string) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Term</label>
                  <select 
                    value={termFilter}
                    onChange={(e) => setTermFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">All Terms</option>
                    {filterOptions.terms.map((t: string) => <option key={t} value={t}>Term {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Week</label>
                  <select 
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">All Weeks</option>
                    {filterOptions.weeks.map((w: string) => <option key={w} value={w}>Week {w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tier</label>
                  <select 
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="all">All Tiers</option>
                    <option value="1">Tier 1</option>
                    <option value="2">Tier 2</option>
                    <option value="3">Tier 3</option>
                  </select>
                </div>
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-margin-mobile md:px-0">
            {filteredCatalog.map(item => {
              const locked = isTierLocked(item);
              const added = profile.planned.some(p => p.id === item.id) || profile.completed.some(c => c.id === item.id);
              const isBookmarked = profile.bookmarks.some(b => b.id === item.id);
              return (
                <div key={item.id} onClick={() => setSelectedItem(item)} className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-sm cursor-pointer group hover:shadow-xl hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative h-48 bg-slate-900 border-b border-slate-100 flex items-center justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToggleBookmark(item); }}
                      className={cn("absolute top-3 left-3 z-20 p-2 rounded-full transition-all backdrop-blur-md", isBookmarked ? "bg-red-500 text-white shadow-lg" : "bg-white/80 text-slate-400 hover:text-red-500 hover:bg-white")}
                    >
                      <Heart className={cn("w-4 h-4", isBookmarked ? "fill-current" : "")} />
                    </button>
                    {item.image ? (
                       <img src={item.image} alt={item.name} className={cn("w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity", locked ? "grayscale opacity-50" : "")} />
                    ) : (
                       <BookOpen className={cn("w-16 h-16 opacity-20 text-white", locked ? "grayscale opacity-10" : "")} />
                    )}
                    {locked && (
                      <div className="absolute inset-0 bg-slate-900/60 z-10 flex flex-col items-center justify-center gap-2 px-3">
                        <Lock className="text-white w-6 h-6 drop-shadow-md" />
                        <span className="text-white text-[10px] font-bold text-center leading-tight">{getLockReason(item)}</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/95 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm z-20">
                      <div className={cn("w-2 h-2 rounded-full", item.tier === 1 ? "bg-emerald-500" : item.tier === 2 ? "bg-blue-500" : "bg-red-500")} />
                      <span className="text-[11px] font-bold text-slate-800 tracking-wide uppercase">{getTierName(item.tier)}</span>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100/50">{item.domain}</span>
                      {item.level && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200/50">{item.level}</span>}
                      {locked && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-100 flex items-center gap-1"><Lock className="w-2.5 h-2.5"/> Advanced</span>}
                      {item.term && <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider border border-slate-200/50">{item.term}{item.week ? `, Wk ${item.week}` : ''}</span>}
                    </div>
                    <h3 className="font-display font-bold text-xl mb-2 text-slate-900 leading-tight group-hover:text-primary transition-colors pr-2 line-clamp-2">{item.name}</h3>
                    <p className="text-sm text-slate-500 mb-6 flex-grow line-clamp-3 leading-relaxed">{item.description || 'Master core concepts and practical applications in this specialized course.'}</p>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                      <div className="flex items-center gap-2">
                         <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                           {item.enrolled || 0} Enrolled (Max {item.capacity || 20})
                         </span>
                      </div>
                      {locked ? (
                        <button className="bg-slate-100 outline-none text-slate-400 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider cursor-not-allowed">Locked</button>
                      ) : added ? (
                        <button className="bg-emerald-50 outline-none text-emerald-600 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider cursor-default">Enrolled</button>
                      ) : profile.pending.some(p => p.id === item.id) ? (
                        <button className="bg-amber-50 outline-none text-amber-600 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider cursor-default">Pending</button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); handleEnrollClick(item); }} className="bg-blue-600 outline-none hover:bg-blue-700 text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all hover:shadow-lg">Enroll</button>
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
               <div className="flex gap-2">
                 <button
                   id="external-validation-btn"
                   onClick={() => setShowExternalModal(true)}
                   className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all shadow-sm bg-white text-slate-600 border-slate-200 hover:border-purple-500 hover:text-purple-700"
                 >
                   <Shield className="w-3.5 h-3.5" />
                   Request External Validation
                 </button>
                 <button
                   id="saints-portal-import-btn"
                   onClick={() => { setShowSaintsImport(!showSaintsImport); setSaintsPortalParsed(null); setSaintsPortalText(''); }}
                   className={cn(
                     "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all shadow-sm",
                     showSaintsImport
                       ? "bg-[#1A365D] text-white border-[#1A365D]"
                       : "bg-white text-slate-600 border-slate-200 hover:border-[#1A365D] hover:text-[#1A365D]"
                   )}
                 >
                   <Upload className="w-3.5 h-3.5" />
                   Import from Saints Portal
                 </button>
               </div>
             </div>
             <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Review the modules and competencies you have mastered so far.</p>

             {/* Saints Portal Import Panel */}
             {showSaintsImport && (
               <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-fadeIn">
                 <h3 className="font-bold text-lg text-slate-900 mb-1 flex items-center gap-2">
                   <Upload className="w-5 h-5 text-[#0151B1]"/>
                   Auto-Categorize from Saints Portal
                 </h3>
                 <p className="text-sm text-slate-500 mb-4 font-medium">
                   Paste the raw text from your Saints Portal records below. The app will automatically suggest a Domain and Tier for each activity.
                 </p>
                 <textarea
                   id="saints-portal-textarea"
                   value={saintsPortalText}
                   onChange={e => setSaintsPortalText(e.target.value)}
                   rows={6}
                   className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none font-mono text-slate-700 bg-slate-50"
                   placeholder={`Paste your Saints Portal records here, one activity per line.\nExample:\nAcademic Excellence Award 2024\nStudent Council Vice-President\nMath Olympiad Training Camp\nVolunteer @ Food Bank`}
                 />
                 <div className="flex gap-3 mt-3">
                   <button
                     id="saints-auto-categorize-btn"
                     onClick={autoParseSaintsPortalData}
                     disabled={saintsPortalText.trim().length === 0}
                     className="px-5 py-2.5 bg-[#0151B1] hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-full text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
                   >
                     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/></svg>
                     Auto-Categorize
                   </button>
                   <button onClick={() => { setSaintsPortalText(''); setSaintsPortalParsed(null); }} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-full text-xs uppercase tracking-wider transition-all">Clear</button>
                 </div>

                 {saintsPortalParsed !== null && (
                   <div className="mt-6 border-t border-slate-100 pt-6">
                     <h4 className="font-bold text-slate-900 mb-3 text-sm">{saintsPortalParsed.length} Activities Detected — Review & Confirm</h4>
                     <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                       {saintsPortalParsed.map((item, i) => (
                         <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                           <div className="flex-1 min-w-0">
                             <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                             <div className="flex gap-2 mt-1">
                               <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", item.tier === 1 ? "bg-emerald-100 text-emerald-700" : item.tier === 2 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>{getTierName(item.tier)}</span>
                               <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wider">{item.domain}</span>
                             </div>
                           </div>
                           <button
                             onClick={async () => {
                               const alreadyTracked = profile.planned.some(p => p.name === item.name) || profile.completed.some(c => c.name === item.name) || profile.pending.some(p => p.name === item.name);
                               if (alreadyTracked) { showNotification('Already tracking this activity', 'err'); return; }
                                 try {
                                   const isMock = user.uid.startsWith('mock_');
                                   if (!isMock) {
                                     const newCourseRef = doc(collection(db, 'users', user.uid, 'courses'));
                                     await setDoc(newCourseRef, {
                                       opportunityId: item.id,
                                       status: 'completed',
                                       order: profile.completed.length,
                                       addedAt: serverTimestamp(),
                                       name: item.name,
                                       tier: item.tier,
                                       domain: item.domain,
                                       isExternal: true,
                                     });
                                   } else {
                                     // Simulated add
                                     setProfile(p => ({
                                       ...p,
                                       completed: [...p.completed, { ...item, status: 'completed', isExternal: true }]
                                     }));
                                   }
                                   setSaintsPortalParsed(prev => prev ? prev.filter((_, idx) => idx !== i) : null);
                                   showNotification(`Added "${item.name}" to your record!`, 'success');
                                 } catch(err) { handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/courses`); }
                             }}
                             className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full transition-all shadow-sm"
                           >Add</button>
                         </div>
                       ))}
                     </div>
                     {saintsPortalParsed.length === 0 && <p className="text-sm text-slate-500 text-center py-4">All activities added! 🎉</p>}
                   </div>
                 )}
               </div>
             )}
             
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

        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl relative">
              <button onClick={() => { setSelectedItem(null); setDirectEnrollId(null); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5"/>
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
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0"/> No prior experience needed. Open to all students.</li>
                    ) : selectedItem.tier === 2 ? (
                      <li className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5"/> Recommended: Complete a Tier 1 course in <strong>{selectedItem.domain}</strong> first.</li>
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          {isTierLocked(selectedItem)
                            ? <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
                            : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>}
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
                    disabled={isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id) || (!enrollJustification && !isTierLocked(selectedItem))}
                    className={cn(
                      "flex-1 py-3 rounded-full font-bold uppercase tracking-wider text-sm transition-all shadow-md active:scale-95",
                      (isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id) || (!enrollJustification && !isTierLocked(selectedItem)))
                         ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                         : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                    )}
                  >
                    {isTierLocked(selectedItem) ? 'Locked Requirement' : profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) ? 'Already Enrolled' : profile.pending.some(p => p.id === selectedItem.id) ? 'Pending Approval' : !enrollJustification ? 'Enter Statement' : 'Submit Enrollment Request'}
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* External Validation Request Modal */}
        {showExternalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
              <button onClick={() => setShowExternalModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-5">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900 mb-1">Request External Validation</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium">Submit an outside activity for teacher review. If approved, it will count towards your Tier 3 prerequisites in the relevant domain.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Activity Name</label>
                  <input
                    id="ext-activity-name"
                    type="text"
                    value={externalForm.name}
                    onChange={e => setExternalForm({...externalForm, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                    placeholder="e.g. National Youth Science Conference"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Domain</label>
                    <select
                      id="ext-domain-select"
                      value={externalForm.domain}
                      onChange={e => setExternalForm({...externalForm, domain: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value="">Select domain...</option>
                      {Array.from(new Set(catalog.map(item => (item.domain || "").trim()))).filter(Boolean).sort().map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Perceived Tier</label>
                    <select
                      id="ext-tier-select"
                      value={externalForm.tier}
                      onChange={e => setExternalForm({...externalForm, tier: Number(e.target.value)})}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white"
                    >
                      <option value={1}>Tier 1 — Awareness</option>
                      <option value={2}>Tier 2 — Develop</option>
                      <option value={3}>Tier 3 — Deepen</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Justification</label>
                  <textarea
                    id="ext-justification"
                    value={externalForm.justification}
                    onChange={e => setExternalForm({...externalForm, justification: e.target.value})}
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                    placeholder="Briefly describe the activity and what you gained from it (e.g. led a team of 5, presented research to 200 attendees)."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowExternalModal(false)} className="flex-1 py-3 rounded-full font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
                <button
                  id="ext-submit-btn"
                  onClick={async () => {
                    if (!externalForm.name.trim() || !externalForm.domain) {
                      showNotification('Please fill in Activity Name and Domain.', 'err');
                      return;
                    }
                    if (!externalForm.justification.trim()) {
                      showNotification('Please provide a justification.', 'err');
                      return;
                    }
                    try {
                      const isMock = user.uid.startsWith('mock_');
                      if (!isMock) {
                        const newCourseRef = doc(collection(db, 'users', user.uid, 'courses'));
                        await setDoc(newCourseRef, {
                          opportunityId: `ext_${Date.now()}`,
                          status: 'pending',
                          order: profile.pending.length,
                          addedAt: serverTimestamp(),
                          name: externalForm.name.trim(),
                          tier: externalForm.tier,
                          domain: externalForm.domain,
                          isExternal: true,
                          justification: externalForm.justification.trim(),
                        });
                      } else {
                        // Simulated submission
                        setProfile(p => ({
                          ...p,
                          pending: [...p.pending, { 
                            id: `ext_${Date.now()}`, 
                            name: externalForm.name, 
                            tier: externalForm.tier, 
                            domain: externalForm.domain, 
                            status: 'pending',
                            isExternal: true,
                            justification: externalForm.justification 
                          }]
                        }));
                      }
                      showNotification('Validation request submitted! Awaiting teacher review.', 'success');
                      setShowExternalModal(false);
                      setExternalForm({ name: '', domain: '', tier: 1, justification: '' });
                    } catch(err) {
                      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/courses`);
                    }
                  }}
                  className="flex-1 py-3 rounded-full font-bold text-sm bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 transition-all"
                >
                  Submit for Review
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmCompleteItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setConfirmCompleteItem(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
                 <X className="w-5 h-5"/>
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
                   onClick={() => handleCompleteCourse(confirmCompleteItem)} 
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
               {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5"/> : <X className="w-5 h-5"/>}
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 selection:bg-blue-100">
         <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100">
           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <Lock className="w-8 h-8 text-blue-600" />
           </div>
           <h1 className="text-2xl font-display font-bold text-slate-900 mb-2">SAJC TDP Roadmap</h1>
           <p className="text-slate-500 mb-8 font-medium">Where your journey begins!</p>
           <button 
             onClick={() => signInWithPopup(auth, googleProvider)}
             className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-full shadow-md transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
           >
             <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
             Continue with Google
           </button>
           <button 
              onClick={() => {
                const mockUser = {
                  uid: 'mock_student_123',
                  email: 'student@sajc.edu.sg',
                  displayName: 'Test Student',
                  photoURL: 'https://i.pravatar.cc/150?u=mock'
                } as any;
                setUser(mockUser);
              }}
              className="w-full mt-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold py-3 rounded-full border border-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              Mock Login (Dev Only)
            </button>
         </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}
