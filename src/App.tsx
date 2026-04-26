import React, { useState, useEffect } from 'react';
import { Lock, Shield, Upload, X, CheckCircle2, LayoutDashboard, BookOpen, TrendingUp, Star, Users, Clock, Image as ImageIcon, Pencil, Heart, ChevronRight, Search, Database, Bell, Plus, Flame, Calendar } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, getDoc, getDocs, collection, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { Opportunity, Profile } from './types';
import { SEED_COURSES } from './seedData';
import { cn, categorizeDomain, getTierName } from './utils';
import { SortablePlannedItem } from './components/SortablePlannedItem';
import { DesktopTopBar, TopNavBar, SideNavBar, BottomNavBar } from './components/Navigation';
import { PendingUserRequests } from './components/PendingUserRequests';
import { useRoadmapData } from './hooks/useRoadmapData';

function MainApp({ user }: { user: User }) {
  // Core data from hook
  const {
    profile, setProfile, dbLoading, catalog, setCatalog,
    isAdminUser, isSuperAdminUser, showAdminPanel, setShowAdminPanel,
    users, activeTab, setActiveTab, toast,
    showNotification, handleToggleBookmark, handleSeedData, handleFileUpload,
    handleCompleteCourse, handleAdd, handleDragEnd, handleRemoveItem,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, filterOptions, chartData, topDomain,
  } = useRoadmapData(user);

  // Local UI state
  const [focusMode, setFocusMode] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [enrollJustification, setEnrollJustification] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [externalForm, setExternalForm] = useState({ name: '', domain: '', tier: 1, justification: '' });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [directEnrollId, setDirectEnrollId] = useState<string | null>(null);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editedImageUrl, setEditedImageUrl] = useState<string>("");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Opportunity> | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [catalogFilterLevel, setCatalogFilterLevel] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [termFilter, setTermFilter] = useState<string>("all");
  const [weekFilter, setWeekFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [domainFilters, setDomainFilters] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Opportunity | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ count: number; items: Opportunity[] } | null>(null);
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Opportunity | null>(null);
  const [saintsPortalText, setSaintsPortalText] = useState("");
  const [saintsPortalParsed, setSaintsPortalParsed] = useState<Opportunity[] | null>(null);
  const [showSaintsImport, setShowSaintsImport] = useState(false);

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

  const autoParseSaintsPortalData = () => {
    const lines = saintsPortalText.split('\n').map(l => l.trim()).filter(l => l.length > 4);
    const results: Opportunity[] = [];
    lines.forEach((line, i) => {
      const domain = categorizeDomain(line);
      const lowerLine = line.toLowerCase();
      let tier = 1;
      if (lowerLine.includes('captain') || lowerLine.includes('director') || lowerLine.includes('chairperson') || lowerLine.includes('president') || lowerLine.includes('finalist') || lowerLine.includes('award') || lowerLine.includes('silver') || lowerLine.includes('gold') || lowerLine.includes('national') || lowerLine.includes('international') || lowerLine.includes('research') || lowerLine.includes('publication')) { tier = 3; }
      else if (lowerLine.includes('committee') || lowerLine.includes('lead') || lowerLine.includes('organis') || lowerLine.includes('represent') || lowerLine.includes('competition') || lowerLine.includes('member') || lowerLine.includes('workshop') || lowerLine.includes('training') || lowerLine.includes('seminar') || lowerLine.includes('project')) { tier = 2; }
      results.push({ id: `saints_import_${i}_${Date.now()}`, name: line.length > 80 ? line.substring(0, 80) + '...' : line, tier, domain });
    });
    setSaintsPortalParsed(results.slice(0, 20));
  };

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
    const success = await handleAdd(item, enrollJustification);
    if (success) {
       setIsEnrolling(false);
       setEnrollJustification('');
       setSelectedItem(null);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-body-sm text-on-background">
        <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4"></div>
        <div className="font-label-bold text-label-bold text-on-surface-variant">Loading your profile...</div>
      </div>
    );
  }

  if (showAdminPanel && isAdminUser) {
    return (
      <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
        <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
        <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
        
        <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
          <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />
          
          <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="font-display-xl text-display-xl text-primary">Teacher Console</h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant mt-stack-sm text-slate-500">Manage students, catalog, and view analytics.</p>
              </div>
              <button onClick={() => setShowAdminPanel(false)} className="px-6 py-2 bg-blue-100/50 text-[#0151B1] font-label-bold text-label-bold rounded-full hover:bg-blue-100 transition-colors uppercase tracking-wider shadow-sm flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" /> Switch to Student View
              </button>
            </div>

            {/* Overview Tab */}
            <div className={cn("flex-col gap-6", activeTab === 0 ? "flex animate-fadeIn" : "hidden")}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0151B1] flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Total Students</h3>
                    <p className="font-display text-3xl font-extrabold text-slate-900 mt-1">{users.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Active Courses</h3>
                    <p className="font-display text-3xl font-extrabold text-slate-900 mt-1">{catalog.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider">Engagement Rate</h3>
                    <p className="font-display text-3xl font-extrabold text-slate-900 mt-1">78%</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-bold text-xl text-slate-900 mb-6">Recent Activity Notifications</h3>
                <div className="space-y-4">
                  {[
                    "New cohort of 150 students onboarded for 2026 Academic Year.",
                    "Course 'Design Thinking Workshop' (Tier 1) updated by admin.",
                    "Student progression rate reached new milestone in Science Domain.",
                    "System weekly automated backup completed smoothly."
                  ].map((act, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Bell className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-slate-700 font-medium">{act}</p>
                        <p className="text-xs text-slate-400 mt-1">{i * 2 + 1} hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Catalog Management Tab */}
            <div className={cn(activeTab === 1 ? "block animate-fadeIn" : "hidden")}>
              <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200">
                 <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Catalog Management</h2>
                 <p className="font-body-lg text-body-lg text-slate-500 mb-6">
                   Upload a JSON/CSV file exported from Google Sheets, or manually seed the database with the default values.
                 </p>
                 
                 <div className="flex flex-wrap gap-4">
                    {isSuperAdminUser && (
                      <>
                        <button 
                          onClick={async () => {
                             const isMock = user.uid.startsWith('mock_');
                             if (isMock) {
                               setCatalog(SEED_COURSES.map(c => ({ ...c, image: `https://image.pollinations.ai/prompt/${encodeURIComponent(c.name + ' course educational abstract')}?width=600&height=400&nologo=true` } as Opportunity)));
                               showNotification("Simulated: Seeded default catalog locally.", "success");
                               return;
                             }
                             handleSeedData();
                           }}
                          className="px-6 py-3 bg-[#0151B1] hover:bg-blue-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider"
                        >
                          Seed Default Catalog Data
                        </button>
                        
                        <button 
                          onClick={async () => {
                             try {
                               const isMock = user.uid.startsWith('mock_');
                               let b = !isMock ? writeBatch(db) : null;
                               let count = 0;
                               const newCatalog = catalog.map(item => ({
                                 ...item,
                                 domain: categorizeDomain(item.name)
                               }));

                               if (!isMock && b) {
                                 for (const item of catalog) {
                                   b.update(doc(db, 'opportunities', item.id), {
                                     domain: categorizeDomain(item.name)
                                   });
                                   count++;
                                   if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
                                 }
                                 if (count > 0) await b.commit();
                                } else {
                                 setCatalog(newCatalog);
                               }
                               
                               showNotification(isMock ? 'Simulated: Re-mapped all domains locally' : 'Re-mapped all domains successfully', 'success');
                             } catch (e) {
                               handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                             }
                           }}
                          className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider"
                        >
                          Auto-Categorize Domains
                        </button>

                        <button 
                          onClick={async () => {
                            try {
                              showNotification("Recalculating enrollments from user data...", "success");
                              const usersSnapshot = await getDocs(collection(db, 'users'));
                              const courseCounts: Record<string, number> = {};
                              
                              for (const userDoc of usersSnapshot.docs) {
                                const coursesSnap = await getDocs(collection(db, 'users', userDoc.id, 'courses'));
                                coursesSnap.forEach(c => {
                                  if (c.data().status === 'planned' || c.data().status === 'completed') {
                                    const oppId = c.data().opportunityId;
                                    courseCounts[oppId] = (courseCounts[oppId] || 0) + 1;
                                  }
                                });
                              }
                              
                              let b = writeBatch(db);
                              let count = 0;
                              for (const item of catalog) {
                                b.update(doc(db, 'opportunities', item.id), {
                                  enrolled: courseCounts[item.id] || 0
                                });
                                count++;
                                if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
                              }
                              if (count > 0) await b.commit();
                              showNotification('Enrollments recalculated successfully based on actual user data.', 'success');
                            } catch (e) {
                              handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                            }
                          }}
                          className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider"
                        >
                          Sync Actual Enrollments
                        </button>

                        <button 
                          onClick={async () => {
                            try {
                              const isMock = user.uid.startsWith('mock_');
                              let b = !isMock ? writeBatch(db) : null;
                              let count = 0;
                              const newCatalog = [...catalog];

                              for (let i = 0; i < newCatalog.length; i++) {
                                const item = newCatalog[i];
                                if (!item.image || item.image.includes('dicebear.com') || item.image.includes('loremflickr.com') || item.image.includes('placeholder')) {
                                  const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name + ' course educational abstract')}?width=600&height=400&nologo=true`;
                                  
                                  if (b) {
                                    b.update(doc(db, 'opportunities', item.id), { image: newUrl });
                                  }
                                  
                                  newCatalog[i] = { ...item, image: newUrl };
                                  count++;
                                  
                                  if (b && count === 400) { 
                                    await b.commit(); 
                                    b = writeBatch(db); 
                                    count = 0; 
                                  }
                                }
                              }

                              if (b && count > 0) {
                                await b.commit();
                              }

                              if (isMock) {
                                setCatalog(newCatalog);
                                localStorage.setItem('mock_catalog', JSON.stringify(newCatalog));
                                showNotification(`Simulated: Generated thumbnails for ${count} items locally.`, 'success');
                              } else {
                                showNotification(`Successfully generated thumbnails for ${count} items in database.`, 'success');
                              }
                            } catch (e) {
                              console.error("Thumbnail Generation Error:", e);
                              handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                            }
                          }}
                          className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Auto-Generate Thumbnails
                        </button>
                      </>
                    )}

                    {isSuperAdminUser && (
                       <label className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-[#0151B1]/30 rounded-full cursor-pointer hover:border-[#0151B1] hover:bg-blue-50 transition-colors group">
                         <input type="file" className="hidden" accept=".json,.csv,.xlsx,.xls" onChange={handleFileUpload} />
                         <Upload className="w-5 h-5 mr-2 text-[#0151B1] transition-colors" />
                         <span className="font-label-bold text-label-bold text-[#0151B1] uppercase tracking-wider">Import from CSV / JSON / XLSX</span>
                       </label>
                    )}
                    <button
                      onClick={() => {
                        setEditingCourseId('new-' + Date.now().toString());
                        setEditingCourseData({ name: '', domain: '', tier: 1, enrolled: 0, capacity: 20 });
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5"/> Add New Course
                    </button>
                 </div>
                 
                 <div className="mt-8 border-t border-slate-200 pt-8">
                   <div className="flex justify-between items-end mb-4">
                     <h3 className="font-headline-md text-headline-md font-bold text-slate-900">Live Catalog Overview</h3>
                     <div className="flex bg-slate-100 p-1 rounded-full">
                       <button
                         onClick={() => setCatalogFilterLevel('all')}
                         className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'all' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                       >
                         All Courses
                       </button>
                       <button
                         onClick={() => setCatalogFilterLevel('mine')}
                         className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'mine' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}
                       >
                         Assigned to Me
                       </button>
                     </div>
                   </div>
                   <div className="h-[500px] overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-inner custom-scrollbar">
                      {catalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                          <Database className="w-8 h-8 mb-2 opacity-50" />
                          <p className="font-body-sm text-body-sm">Catalog is empty. Please seed or import data.</p>
                        </div>
                      ) : (
                        <ul className="space-y-2">
                          {catalog.filter(item => catalogFilterLevel === 'all' || (item.ownerEmails?.includes(user?.email || ''))).map(item => (
                            <li key={item.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors items-center">
                              <div className="flex items-center gap-3">
                                <div className="relative group/thumbnail shrink-0 cursor-pointer">
                                  {item.image ? (
                                    <>
                                      <img src={item.image} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
                                      <div className="absolute z-50 left-10 top-1/2 -translate-y-1/2 hidden group-hover/thumbnail:block w-48 h-48 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-none">
                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <ImageIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-body-lg text-body-lg font-semibold text-slate-800">{item.name}</span>
                              </div>
                              <div className="flex gap-2 items-center mt-1 flex-wrap">
                                <span className={cn("px-2 py-1 text-xs rounded-full font-label-bold text-label-bold", item.tier === 1 ? "bg-emerald-100 text-emerald-800" : item.tier === 2 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800")}>{getTierName(item.tier)}</span>
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-label-bold text-label-bold uppercase tracking-wider border border-slate-200">{item.domain}</span>
                                <span className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full font-label-bold text-label-bold tracking-wider border border-purple-100">
                                  {item.enrolled || 0} Enrolled (Max {item.capacity || 20})
                                </span>
                                {item.level && <span className="px-2 py-1 bg-white text-slate-500 text-[10px] rounded border border-slate-200">{item.level}</span>}
                                {item.term && <span className="px-2 py-1 bg-white text-slate-500 text-[10px] rounded border border-slate-200">{item.term}{item.week ? `, Wk ${item.week}` : ''}</span>}
                                
                                {(isSuperAdminUser || (user?.email && item.ownerEmails?.includes(user?.email))) && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCourseId(item.id);
                                        setEditingCourseData({
                                          ...item,
                                          description: item.description || 'Master core concepts and practical applications.'
                                        });
                                      }}
                                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors ml-2"
                                      title="Edit Details"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingImageId(item.id);
                                        setEditedImageUrl(item.image || "");
                                      }}
                                      className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors"
                                      title="Edit Thumbnail"
                                    >
                                      <ImageIcon className="w-4 h-4" />
                                    </button>
                                    {isSuperAdminUser && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const isMock = user.uid.startsWith('mock_');
                                            if (!isMock) {
                                              await deleteDoc(doc(db, 'opportunities', item.id));
                                            } else {
                                              // Simulated delete
                                              setCatalog(catalog.filter(o => o.id !== item.id));
                                            }
                                            showNotification('Removed successfully', 'success');
                                          } catch (e) {
                                            handleFirestoreError(e, OperationType.DELETE, 'opportunities');
                                          }
                                        }}
                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors ml-1"
                                        title="Delete Item"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                   </div>
                 </div>
              </div>
            </div>
            
            {/* Students Tab */}
            <div className={cn("flex flex-col animate-fadeIn", activeTab === 2 ? "flex" : "hidden")}>
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200">
                  <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Student Directory</h2>
                  <p className="font-body-lg text-body-lg text-slate-500 mb-6">Manage student profiles and view overall progress records.</p>
                  
                  <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
                                {(u.studentName || 'S').substring(0, 2).toUpperCase()}
                              </div>
                              {u.studentName || 'Unknown Student'}
                            </td>
                            <td className="py-4 px-4 text-slate-500 hidden md:table-cell">{u.email}</td>
                            <td className="py-4 px-4 text-right">
                              <button onClick={() => showNotification('View Profile feature coming soon', 'success')} className="text-blue-600 hover:text-blue-800 font-bold text-sm">View Profile</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

            {/* Requests Tab */}
            <div className={cn("flex flex-col animate-fadeIn", activeTab === 3 ? "flex" : "hidden")}>
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200">
                  <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Enrollment Requests</h2>
                  <p className="font-body-lg text-body-lg text-slate-500 mb-6">Manage pending student enrollments.</p>
                  
                  <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                          <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <PendingUserRequests 
                            key={u.id} 
                            userDoc={u} 
                            catalog={catalog} 
                            showNotification={showNotification} 
                            mockPending={u.id === user.uid && user.uid.startsWith('mock_') ? profile.pending : undefined}
                            mockProcessed={u.id === user.uid && user.uid.startsWith('mock_') ? [...profile.planned, ...profile.rejected] : undefined}
                            onMockAction={(courseId, action) => {
                              if (action === 'approve') {
                                const course = profile.pending.find(p => p.courseId === courseId || p.id === courseId);
                                if (course) {
                                  setProfile(p => ({
                                    ...p,
                                    pending: p.pending.filter(x => x.courseId !== courseId && x.id !== courseId),
                                    planned: [...p.planned, {...course, status: 'planned'}]
                                  }));
                                }
                              } else if (action === 'reject') {
                                const course = profile.pending.find(p => p.courseId === courseId || p.id === courseId);
                                if (course) {
                                  setProfile(p => ({
                                    ...p,
                                    pending: p.pending.filter(x => x.courseId !== courseId && x.id !== courseId),
                                    rejected: [...p.rejected, {...course, status: 'rejected'}]
                                  }));
                                }
                              } else if (action === 'undo') {
                                const plannedCourse = profile.planned.find(p => p.courseId === courseId || p.id === courseId);
                                const rejectedCourse = profile.rejected.find(p => p.courseId === courseId || p.id === courseId);
                                const course = plannedCourse || rejectedCourse;
                                if (course) {
                                  setProfile(p => ({
                                    ...p,
                                    planned: p.planned.filter(x => x.courseId !== courseId && x.id !== courseId),
                                    rejected: p.rejected.filter(x => x.courseId !== courseId && x.id !== courseId),
                                    pending: [...p.pending, {...course, status: 'pending'}]
                                  }));
                                }
                              }
                            }}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>

            {/* Analytics Tab */}
            <div className={cn("flex flex-col animate-fadeIn", activeTab === 4 ? "flex" : "hidden")}>
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200">
                  <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">School Analytics</h2>
                  <p className="font-body-lg text-body-lg text-slate-500 mb-6">Current performance metrics of the entire cohort.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex flex-col items-center justify-center">
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Domain Distribution</div>
                      <div className="w-full flex items-end justify-around h-32 px-4 gap-2">
                        {domainDistribution.topDomains.map(([domain, count], i) => {
                          const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400'];
                          const textColors = ['text-blue-900', 'text-emerald-900', 'text-purple-900', 'text-amber-900', 'text-rose-900'];
                          return (
                            <div key={domain} className="flex flex-col items-center justify-end h-full flex-1">
                              <div className={`w-full max-w-[48px] rounded-t-md flex justify-center text-xs font-bold pt-2 ${colors[i % colors.length]} ${textColors[i % colors.length]}`} style={{ height: `${(count / domainDistribution.max) * 100}%`, minHeight: '20px' }}>
                                {count}
                              </div>
                              <div className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center px-1" title={domain}>{domain.substring(0, 8)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex flex-col items-center justify-center">
                       <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
                       <div className="text-xl font-bold text-slate-700">Detailed Report Generation</div>
                       <button className="mt-4 px-6 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Download CSV</button>
                    </div>
                  </div>
                </div>
            </div>

             {/* Settings Tab */}
             <div className={cn("flex flex-col animate-fadeIn", activeTab === 5 ? "flex" : "hidden")}>
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200">
                  <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">System Settings</h2>
                  <p className="font-body-lg text-body-lg text-slate-500 mb-6">Manage global preferences and your admin profile.</p>

                  <div className="space-y-6 max-w-xl">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">Academic Year</div>
                        <div className="text-sm text-slate-500 text-slate-500">Currently set to 2026.</div>
                      </div>
                      <button className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-100">Change</button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-900">Sign Out</div>
                        <div className="text-sm text-slate-500 text-slate-500">Log out of your administrative session.</div>
                      </div>
                      <button onClick={() => signOut(auth)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 font-bold rounded-lg text-sm hover:bg-red-100">Sign Out</button>
                    </div>
                  </div>
                </div>
            </div>
            
          </div>
          {editingCourseId && editingCourseData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button 
                  onClick={() => {
                     setEditingCourseId(null);
                     setEditingCourseData(null);
                  }} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                   <X className="w-5 h-5"/>
                </button>
                <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Course Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Course Name</label>
                    <input 
                      type="text" 
                      value={editingCourseData.name || ''} 
                      onChange={(e) => setEditingCourseData({...editingCourseData, name: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Domain</label>
                        <select 
                          value={editingCourseData.domain || ''} 
                          onChange={(e) => setEditingCourseData({...editingCourseData, domain: e.target.value})}
                          className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="">Select Domain...</option>
                          {Array.from(new Set(catalog.map(item => (item.domain || "").trim()))).filter(Boolean).sort().map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tier (Level)</label>
                        <select 
                          value={editingCourseData.tier || 1} 
                          onChange={(e) => setEditingCourseData({...editingCourseData, tier: Number(e.target.value)})}
                          className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value={1}>Tier 1</option>
                          <option value={2}>Tier 2</option>
                          <option value={3}>Tier 3</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Capacity</label>
                        <input 
                          type="number"
                          value={editingCourseData.capacity || ''} 
                          onChange={(e) => setEditingCourseData({...editingCourseData, capacity: parseInt(e.target.value) || 0})}
                          className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                          placeholder="e.g. 40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Level (e.g. JC1)</label>
                      <input 
                        type="text" 
                        value={editingCourseData.level || ''} 
                        onChange={(e) => setEditingCourseData({...editingCourseData, level: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Term</label>
                      <input 
                        type="text" 
                        value={editingCourseData.term || ''} 
                        onChange={(e) => setEditingCourseData({...editingCourseData, term: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Week</label>
                      <input 
                        type="text" 
                        value={editingCourseData.week || ''} 
                        onChange={(e) => setEditingCourseData({...editingCourseData, week: e.target.value})}
                        className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-slate-700">Description</label>
                      <button
                        onClick={async () => {
                          if (!editingCourseData.name || !editingCourseData.domain) {
                            showNotification('Please enter a course name and domain first', 'err');
                            return;
                          }
                          setIsGeneratingDescription(true);
                          try {
                            const res = await fetch('/api/generate-description', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                name: editingCourseData.name,
                                domain: editingCourseData.domain,
                                tier: editingCourseData.tier || 1
                              })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to generate');
                            setEditingCourseData(prev => ({ ...prev, description: data.description }));
                            showNotification('Description generated', 'success');
                          } catch (err: any) {
                            showNotification(err.message || 'Failed to generate description', 'err');
                          } finally {
                            setIsGeneratingDescription(false);
                          }
                        }}
                        disabled={isGeneratingDescription}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isGeneratingDescription ? (
                          <div className="w-3 h-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                        ) : (
                          <Flame className="w-3 h-3" />
                        )}
                        Auto-Generate
                      </button>
                    </div>
                    <textarea 
                      rows={4}
                      value={editingCourseData.description || ''} 
                      onChange={(e) => setEditingCourseData({...editingCourseData, description: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    />
                  </div>

                  {isSuperAdminUser && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Assigned Teachers (Owner Emails, comma separated)</label>
                      <input 
                        type="text" 
                        value={editingCourseData.ownerEmails?.join(', ') || ''} 
                        onChange={(e) => {
                          const emails = e.target.value.split(',').map(em => em.trim()).filter(em => em);
                          setEditingCourseData({...editingCourseData, ownerEmails: emails});
                        }}
                        className="w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="teacher1@sajc.edu.sg, teacher2@sajc.edu.sg"
                      />
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Emails must end with @sajc.edu.sg</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => {
                        setEditingCourseId(null);
                        setEditingCourseData(null);
                      }} 
                      className="px-5 py-2.5 rounded-full text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const isMock = user.uid.startsWith('mock_');
                          if (!isMock) {
                            if (editingCourseId?.startsWith('new-')) {
                              await setDoc(doc(collection(db, 'opportunities')), { ...editingCourseData, createdAt: serverTimestamp(), enrolled: 0 });
                            } else {
                              await updateDoc(doc(db, 'opportunities', editingCourseId!), { ...editingCourseData, updatedAt: serverTimestamp() });
                            }
                          } else {
                            if (editingCourseId?.startsWith('new-')) {
                              setCatalog([...catalog, { id: 'mock-' + Date.now(), ...editingCourseData } as Opportunity]);
                            } else {
                              setCatalog(catalog.map(o => o.id === editingCourseId ? { ...o, ...editingCourseData } as Opportunity : o));
                            }
                          }
                          showNotification('Changes saved successfully', 'success');
                          setEditingCourseId(null);
                          setEditingCourseData(null);
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                        }
                      }}
                      className="px-8 py-2.5 bg-[#0151B1] text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
      <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
      <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
      
      <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
        <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />
        
        <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap">
          <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8", focusMode && "lg:grid-cols-1")}>
            
            {/* Left Column: Explorer */}
            <div className={cn("lg:col-span-8 flex flex-col gap-8", focusMode && "hidden md:flex")}>
               <section>
                  <div className="flex items-end justify-between mb-8 px-1">
                    <div>
                      <h2 className="font-display-xl text-display-xl text-primary">Opportunity Explorer</h2>
                      <p className="font-body-lg text-body-lg text-on-surface-variant mt-stack-sm text-slate-500">Discover Tier 1 to 3 growth opportunities.</p>
                    </div>
                    <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-label-bold text-label-bold uppercase tracking-wider", showFilters ? "bg-blue-50 border-blue-200 text-[#0151B1]" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}>
                      <Search className="w-4 h-4" /> Filter & Search
                    </button>
                  </div>

                  {showFilters && (
                    <div className="bg-white rounded-3xl p-6 mb-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-fadeIn">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Search</label>
                            <input type="text" placeholder="Search keywords..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tier</label>
                            <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                              <option value="all">All Tiers</option>
                              <option value="1">Tier 1 (Awareness)</option>
                              <option value="2">Tier 2 (Develop)</option>
                              <option value="3">Tier 3 (Deepen)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                              <option value="all">All Levels</option>
                              {filterOptions.levels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Term</label>
                            <select value={termFilter} onChange={(e) => setTermFilter(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none">
                              <option value="all">All Terms</option>
                              {filterOptions.terms.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                       </div>
                       
                       <div className="mt-6 flex flex-wrap gap-2">
                         {['STEM & Innovation', 'Leadership & Service', 'Aesthetics & Culture', 'Physical & Sports', 'Global Awareness'].map(domain => {
                           const active = domainFilters.includes(domain.toLowerCase());
                           return (
                             <button key={domain} onClick={() => setDomainFilters(prev => active ? prev.filter(d => d !== domain.toLowerCase()) : [...prev, domain.toLowerCase()])} className={cn("px-4 py-1.5 rounded-full text-xs font-label-bold transition-all border", active ? "bg-[#0151B1] border-[#0151B1] text-white shadow-md" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300")}>
                               {domain}
                             </button>
                           );
                         })}
                       </div>
                       
                       <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                         <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <div className={cn("w-4 h-4 rounded border transition-all flex items-center justify-center", showBookmarksOnly ? "bg-[#0151B1] border-[#0151B1]" : "border-slate-300 group-hover:border-slate-400")}>
                                <input type="checkbox" className="hidden" checked={showBookmarksOnly} onChange={() => setShowBookmarksOnly(!showBookmarksOnly)} />
                                {showBookmarksOnly && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                              </div>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Show Bookmarks Only</span>
                            </label>
                         </div>
                         <button onClick={() => { setSearch(""); setTierFilter("all"); setLevelFilter("all"); setTermFilter("all"); setDomainFilters([]); setShowBookmarksOnly(false); }} className="text-xs font-bold text-slate-400 hover:text-[#0151B1] transition-colors uppercase tracking-widest">Clear All</button>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                    {filteredCatalog.map((item, idx) => {
                      const isLocked = isTierLocked(item);
                      const isPlanned = profile.planned.some(p => p.id === item.id);
                      const isCompleted = profile.completed.some(c => c.id === item.id);
                      const isPending = profile.pending.some(p => p.id === item.id);
                      const isBookmarked = profile.bookmarks.some(b => b.id === item.id);
                      
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => setSelectedItem(item)}
                          className={cn(
                            "group relative bg-white rounded-[2rem] overflow-hidden border border-slate-200 hover:border-[#0151B1]/30 hover:shadow-[0_10px_30px_rgba(1,81,177,0.08)] transition-all duration-500 cursor-pointer flex flex-col h-full",
                            isLocked && "opacity-75 grayscale-[0.3]"
                          )}
                        >
                          {/* Thumbnail */}
                          <div className="relative h-40 overflow-hidden">
                            <img 
                              src={item.image || `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name + ' course educational abstract')}?width=600&height=400&nologo=true`} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
                            
                            <div className="absolute top-4 left-4 flex gap-2">
                               <span className={cn(
                                 "px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-sm",
                                 item.tier === 1 ? "bg-emerald-500/80" : item.tier === 2 ? "bg-blue-500/80" : "bg-red-500/80"
                               )}>
                                 {getTierName(item.tier)}
                               </span>
                            </div>
                            
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleToggleBookmark(item); }}
                              className={cn(
                                "absolute top-4 right-4 p-2 rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110",
                                isBookmarked ? "bg-amber-500/90 text-white" : "bg-white/20 text-white hover:bg-white/40"
                              )}
                            >
                              <Star className={cn("w-3.5 h-3.5", isBookmarked && "fill-current")} />
                            </button>

                            {isLocked && (
                               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
                                 <Lock className="w-8 h-8 text-white/90 mb-2" />
                                 <span className="text-white font-label-bold text-label-bold uppercase tracking-widest text-[10px]">Prerequisite Needed</span>
                               </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-6 flex flex-col flex-1">
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex justify-between items-center">
                               {item.domain}
                               {isCompleted && <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3"/> Done</span>}
                               {isPlanned && <span className="flex items-center gap-1 text-blue-500"><Clock className="w-3 h-3"/> Planned</span>}
                               {isPending && <span className="flex items-center gap-1 text-amber-500"><Clock className="w-3 h-3"/> Pending</span>}
                            </div>
                            <h3 className="font-headline-md text-headline-md font-bold text-slate-900 leading-tight mb-2 group-hover:text-[#0151B1] transition-colors line-clamp-2">{item.name}</h3>
                            <p className="text-body-sm text-on-surface-variant line-clamp-2 mb-4 text-slate-500">{item.description || 'Master core competencies through hands-on learning and collaborative projects.'}</p>
                            
                            <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-500">{item.enrolled || 0} / {item.capacity || 20}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[11px] font-bold text-slate-500">{item.term || 'T1'} - {item.level || 'JC1'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredCatalog.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                       <BookOpen className="w-12 h-12 mb-4 opacity-20" />
                       <p className="font-bold">No opportunities found matching your filters.</p>
                       <button onClick={() => { setSearch(""); setTierFilter("all"); setLevelFilter("all"); setTermFilter("all"); setDomainFilters([]); setShowBookmarksOnly(false); }} className="mt-4 text-blue-600 font-bold hover:underline">Reset all filters</button>
                    </div>
                  )}
               </section>
            </div>

            {/* Right Column: Roadmap & Profile */}
            <div className={cn("lg:col-span-4 flex flex-col gap-8", focusMode && "lg:col-span-12")}>
               
               {/* Stats Widget */}
               <section className="bg-[#0151B1] rounded-[2.5rem] p-8 text-white shadow-[0_20px_50px_rgba(1,81,177,0.2)] relative overflow-hidden group">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100/80">Talent Development</h2>
                        <p className="text-sm font-bold">Tier Progression</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="text-center">
                        <div className="text-2xl font-display font-black">{profile.completed.filter(c => c.tier === 1).length + profile.planned.filter(c => c.tier === 1).length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1">Tier 1</div>
                      </div>
                      <div className="text-center border-x border-white/10">
                        <div className="text-2xl font-display font-black">{profile.completed.filter(c => c.tier === 2).length + profile.planned.filter(c => c.tier === 2).length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1">Tier 2</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-display font-black">{profile.completed.filter(c => c.tier === 3).length + profile.planned.filter(c => c.tier === 3).length}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1">Tier 3</div>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                       <div className="flex justify-between items-center mb-2">
                         <span className="text-[10px] font-bold uppercase tracking-wider">Growth Balance</span>
                         <span className="text-[10px] font-bold">{Math.round(((profile.completed.length + profile.planned.length) / 15) * 100)}%</span>
                       </div>
                       <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${Math.min(100, ((profile.completed.length + profile.planned.length) / 15) * 100)}%` }}></div>
                       </div>
                    </div>
                  </div>
               </section>

               {/* Growth Radar Chart */}
               <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" /> Growth Profile
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#E2E8F0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                        <Radar name="Talent Progression" dataKey="Completed" stroke="#0151B1" fill="#0151B1" fillOpacity={0.6} />
                        <Radar name="Planned" dataKey="Planned" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-900 leading-relaxed">
                      <span className="font-bold">Growth Insight:</span> Your strongest development is in <span className="font-bold text-blue-700">{topDomain?.subject || 'STEM'}</span>. Consider exploring Aesthetic options to balance your profile.
                    </p>
                  </div>
               </section>

               {/* Roadmap Widget */}
               <section className="flex-1 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between mb-6 px-1">
                    <h3 className="font-display font-bold text-xl text-slate-900">My Roadmap</h3>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">{profile.planned.length} Items</span>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden relative">
                    {/* Roadmap Timeline */}
                    <div className="absolute left-8 top-10 bottom-10 w-px bg-slate-100"></div>
                    
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10">
                      {profile.planned.length === 0 && profile.pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
                          <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 opacity-50">
                            <Plus className="w-8 h-8 text-slate-300" />
                          </div>
                          <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-2">Your Journey Starts Here</h4>
                          <p className="text-sm text-slate-400">Enroll in courses from the explorer to see your progression roadmap.</p>
                          <button onClick={() => setActiveTab(0)} className="mt-6 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">Explore Opportunities</button>
                        </div>
                      ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={profile.planned.map(p => p.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-4">
                               {profile.pending.map((item) => (
                                 <div key={item.id} className="relative pl-10 animate-pulse">
                                    <div className="absolute left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-400 bg-white z-20"></div>
                                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between">
                                       <div>
                                          <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pending Approval</div>
                                          <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                       </div>
                                       <button onClick={() => handleRemoveItem(item.id)} className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-400 transition-colors">
                                         <X className="w-3.5 h-3.5" />
                                       </button>
                                    </div>
                                 </div>
                               ))}
                               {profile.planned.map((item) => (
                                 <SortablePlannedItem key={item.id} item={item} onRemove={handleRemoveItem} onComplete={setConfirmCompleteItem} />
                               ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                       <button 
                         onClick={() => setShowSaintsImport(true)}
                         className="w-full py-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:border-blue-200 hover:shadow-md transition-all group"
                       >
                         <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0151B1] flex items-center justify-center group-hover:bg-[#0151B1] group-hover:text-white transition-colors">
                           <Plus className="w-4 h-4" />
                         </div>
                         <span className="font-label-bold text-label-bold text-slate-600 uppercase tracking-widest">Import from Saints Portal</span>
                       </button>
                    </div>
                  </div>
               </section>

            </div>
          </div>
        </div>
      </main>

      <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />

      {/* Item Detail Modal */}
      {selectedItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-slideUp">
               <button onClick={() => {setSelectedItem(null); setIsEnrolling(false); setEnrollJustification('');}} className="absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white md:text-slate-400 md:bg-transparent transition-all z-10">
                 <X className="w-6 h-6" />
               </button>
               
               <div className="flex flex-col md:flex-row h-full">
                 <div className="md:w-1/2 h-48 md:h-auto relative">
                   <img src={selectedItem.image || `https://image.pollinations.ai/prompt/${encodeURIComponent(selectedItem.name + ' course educational abstract')}?width=600&height=400&nologo=true`} className="w-full h-full object-cover" alt="" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent md:bg-gradient-to-r md:from-transparent md:to-white/10"></div>
                 </div>
                 
                 <div className="md:w-1/2 p-8 md:p-10 flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-widest text-white shadow-sm",
                        selectedItem.tier === 1 ? "bg-emerald-500" : selectedItem.tier === 2 ? "bg-blue-500" : "bg-red-500"
                      )}>
                        {getTierName(selectedItem.tier)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200">
                        {selectedItem.domain}
                      </span>
                    </div>

                    <h2 className="font-display font-black text-2xl text-slate-900 leading-tight mb-4">{selectedItem.name}</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">{selectedItem.description || 'Master core competencies through hands-on learning and collaborative projects. This course focuses on building industry-relevant skills.'}</p>
                    
                    <div className="space-y-4 mb-8">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                            <Calendar className="w-4 h-4" />
                         </div>
                         <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule</div>
                            <div className="text-xs font-bold text-slate-700">{selectedItem.term || 'Term 1'}, {selectedItem.week ? `Week ${selectedItem.week}` : 'Full Term'}</div>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                            <Users className="w-4 h-4" />
                         </div>
                         <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Availability</div>
                            <div className="text-xs font-bold text-slate-700">{selectedItem.enrolled || 0} / {selectedItem.capacity || 20} slots filled</div>
                         </div>
                       </div>
                    </div>

                    <div className="mt-auto">
                       {isTierLocked(selectedItem) && (
                         <div className="p-4 rounded-2xl bg-red-50 border border-red-100 mb-4">
                            <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest mb-1">
                               <Lock className="w-3.5 h-3.5" /> Tier Locked
                            </div>
                            <p className="text-[11px] text-red-700 leading-relaxed">{getLockReason(selectedItem)}</p>
                            {getUnlockSuggestions(selectedItem).length > 0 && (
                               <div className="mt-3 pt-3 border-t border-red-100">
                                 <p className="text-[10px] font-bold text-red-800 mb-2 uppercase tracking-tight">Suggested Prerequisites:</p>
                                 <div className="flex flex-col gap-2">
                                   {getUnlockSuggestions(selectedItem).map(s => (
                                     <button key={s.id} onClick={() => setSelectedItem(s)} className="text-left text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1.5">
                                       <ChevronRight className="w-3 h-3" /> {s.name}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                            )}
                         </div>
                       )}

                       {isEnrolling ? (
                         <div className="space-y-4 animate-fadeIn">
                           <div>
                             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Statement of Interest</label>
                             <textarea 
                               autoFocus
                               value={enrollJustification}
                               onChange={(e) => setEnrollJustification(e.target.value)}
                               placeholder="Explain why you want to enroll (at least 10 words)..."
                               className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none h-24"
                             />
                           </div>
                           <div className="flex gap-3">
                             <button onClick={() => setIsEnrolling(false)} className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Back</button>
                             <button 
                               onClick={() => handleEnrollClick(selectedItem)}
                               className="flex-1 py-3 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Confirm</button>
                           </div>
                         </div>
                       ) : (
                         <div className="flex gap-3">
                           <button 
                             disabled={isTierLocked(selectedItem) || profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) || profile.pending.some(p => p.id === selectedItem.id)}
                             onClick={() => setIsEnrolling(true)}
                             className="flex-1 py-4 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none">
                             {profile.planned.some(p => p.id === selectedItem.id) || profile.completed.some(c => c.id === selectedItem.id) ? 'Already Enrolled' : profile.pending.some(p => p.id === selectedItem.id) ? 'Pending Approval' : isTierLocked(selectedItem) ? 'Requirement Locked' : 'Enroll Now'}
                           </button>
                         </div>
                       )}
                    </div>
                 </div>
               </div>
            </div>
         </div>
      )}

      {/* Saints Portal Import Modal */}
      {showSaintsImport && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative p-8">
               <h2 className="font-display font-black text-2xl text-slate-900 mb-2">Saints Portal Sync</h2>
               <p className="text-slate-500 text-sm mb-6">Paste your record from Saints Portal to auto-populate your roadmap.</p>
               
               <textarea 
                 className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none mb-6"
                 placeholder="Paste your records here (e.g. Science Olympiad, Prefect Council...)"
                 value={saintsPortalText}
                 onChange={(e) => setSaintsPortalText(e.target.value)}
               />

               {saintsPortalParsed && (
                 <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <h3 className="font-bold text-blue-900 text-xs uppercase tracking-widest mb-3">Detected Progression Items ({saintsPortalParsed.length})</h3>
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {saintsPortalParsed.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/80 p-2 rounded-lg">
                          <span className="text-xs font-bold text-slate-700 truncate">{item.name}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-[#0151B1] text-[9px] font-bold rounded-full">Tier {item.tier}</span>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               <div className="flex gap-3">
                 <button onClick={() => {setShowSaintsImport(false); setSaintsPortalParsed(null); setSaintsPortalText("");}} className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                 {!saintsPortalParsed ? (
                   <button onClick={autoParseSaintsPortalData} className="flex-1 py-3 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Scan Records</button>
                 ) : (
                   <button 
                    onClick={() => {
                      setProfile(p => ({
                        ...p,
                        completed: [...p.completed, ...saintsPortalParsed]
                      }));
                      showNotification(`Successfully imported ${saintsPortalParsed.length} items.`, 'success');
                      setShowSaintsImport(false);
                      setSaintsPortalParsed(null);
                      setSaintsPortalText("");
                    }} 
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Sync to Profile</button>
                 )}
               </div>
            </div>
         </div>
      )}

      {/* Completion Modal */}
      {confirmCompleteItem && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl animate-slideUp">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-10 h-10" />
               </div>
               <h2 className="font-display font-black text-2xl text-slate-900 mb-2">Course Completed?</h2>
               <p className="text-slate-500 text-sm mb-8">Have you successfully finished <span className="font-bold text-slate-700">{confirmCompleteItem.name}</span>? This will move it to your completed records.</p>
               <div className="flex gap-3">
                 <button onClick={() => setConfirmCompleteItem(null)} className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Not Yet</button>
                 <button 
                  onClick={async () => {
                    const isMock = user.uid.startsWith('mock_');
                    if (!isMock) {
                      await updateDoc(doc(db, 'users', user.uid, 'courses', confirmCompleteItem.id), { status: 'completed', completedAt: serverTimestamp() });
                    } else {
                      setProfile(p => ({
                        ...p,
                        planned: p.planned.filter(x => x.id !== confirmCompleteItem.id),
                        completed: [...p.completed, { ...confirmCompleteItem, status: 'completed' }]
                      }));
                    }
                    showNotification('Well done! Course moved to completed.', 'success');
                    setConfirmCompleteItem(null);
                  }}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Yes, Completed</button>
               </div>
            </div>
         </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white font-label-bold text-label-bold uppercase tracking-widest shadow-2xl z-[100] animate-slideUp",
          toast.type === 'success' ? "bg-emerald-500" : "bg-red-500"
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// Auth Wrapper
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-body-sm">
        <div className="absolute -left-40 -bottom-40 w-80 h-80 bg-blue-100/50 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute -right-40 -top-40 w-80 h-80 bg-blue-100/30 rounded-full blur-[100px] animate-pulse"></div>
        
        <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 md:p-12 shadow-[0_10px_50px_rgba(1,81,177,0.05)] border border-slate-200 relative z-10 animate-slideUp">
           <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-[#0151B1] rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-200 animate-float">
                <TrendingUp className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-display font-black text-4xl text-slate-900 leading-tight mb-4">TDP Roadmap</h1>
              <p className="text-slate-500 font-medium leading-relaxed mb-10">
                The talent development journey starts here. Plan, track, and visualize your growth across three tiers of excellence.
              </p>
              
              <button 
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-4 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 group mb-4">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
                <span className="font-label-bold text-label-bold text-slate-600 group-hover:text-[#0151B1] transition-colors uppercase tracking-widest">Sign in with Google</span>
              </button>

              <button 
                onClick={() => {
                  const mockUser = {
                    uid: 'mock_' + Date.now(),
                    displayName: 'Mock Student',
                    email: 'student@sajc.edu.sg',
                    photoURL: null,
                    emailVerified: true
                  } as User;
                  setUser(mockUser);
                }}
                className="w-full py-4 bg-blue-50/50 border-2 border-transparent rounded-2xl flex items-center justify-center gap-4 hover:bg-blue-100 transition-all duration-300 group">
                <Shield className="w-5 h-5 text-blue-600" />
                <span className="font-label-bold text-label-bold text-blue-600 uppercase tracking-widest">Mock Login (Dev Only)</span>
              </button>

              <p className="mt-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Authorized Access Only &bull; SAJC 2026</p>
           </div>
        </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}

