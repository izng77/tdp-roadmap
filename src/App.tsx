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
  const [editedImageUrl, setEditedImageUrl] = useState<string>(\"\");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseData, setEditingCourseData] = useState<Partial<Opportunity> | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [catalogFilterLevel, setCatalogFilterLevel] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState(\"\");
  const [tierFilter, setTierFilter] = useState<string>(\"all\");
  const [levelFilter, setLevelFilter] = useState<string>(\"all\");
  const [termFilter, setTermFilter] = useState<string>(\"all\");
  const [weekFilter, setWeekFilter] = useState<string>(\"all\");
  const [showFilters, setShowFilters] = useState(false);
  const [domainFilters, setDomainFilters] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Opportunity | null>(null);
  const [syncSummary, setSyncSummary] = useState<{ count: number; items: Opportunity[] } | null>(null);
  const [confirmCompleteItem, setConfirmCompleteItem] = useState<Opportunity | null>(null);
  const [saintsPortalText, setSaintsPortalText] = useState(\"\");
  const [saintsPortalParsed, setSaintsPortalParsed] = useState<Opportunity[] | null>(null);
  const [showSaintsImport, setShowSaintsImport] = useState(false);

  const filteredCatalog = React.useMemo(() =\u003e {
    return catalog.filter(item =\u003e {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === \"all\" || item.tier.toString() === tierFilter;
      const matchLevel = levelFilter === \"all\" || item.level === levelFilter;
      const matchTerm = termFilter === \"all\" || item.term === termFilter;
      const matchWeek = weekFilter === \"all\" || item.week === weekFilter;
      const matchDomain = domainFilters.length === 0 || domainFilters.includes((item.domain || \"\").trim().toLowerCase());
      const matchBookmark = !showBookmarksOnly || profile.bookmarks.some(b =\u003e b.id === item.id);
      return matchSearch \u0026\u0026 matchTier \u0026\u0026 matchLevel \u0026\u0026 matchTerm \u0026\u0026 matchWeek \u0026\u0026 matchDomain \u0026\u0026 matchBookmark;
    });
  }, [catalog, search, tierFilter, levelFilter, termFilter, weekFilter, domainFilters, showBookmarksOnly, profile.bookmarks]);

  const autoParseSaintsPortalData = () =\u003e {
    const lines = saintsPortalText.split('\\n').map(l =\u003e l.trim()).filter(l =\u003e l.length \u003e 4);
    const results: Opportunity[] = [];
    lines.forEach((line, i) =\u003e {
      const domain = categorizeDomain(line);
      const lowerLine = line.toLowerCase();
      let tier = 1;
      if (lowerLine.includes('captain') || lowerLine.includes('director') || lowerLine.includes('chairperson') || lowerLine.includes('president') || lowerLine.includes('finalist') || lowerLine.includes('award') || lowerLine.includes('silver') || lowerLine.includes('gold') || lowerLine.includes('national') || lowerLine.includes('international') || lowerLine.includes('research') || lowerLine.includes('publication')) { tier = 3; }
      else if (lowerLine.includes('committee') || lowerLine.includes('lead') || lowerLine.includes('organis') || lowerLine.includes('represent') || lowerLine.includes('competition') || lowerLine.includes('member') || lowerLine.includes('workshop') || lowerLine.includes('training') || lowerLine.includes('seminar') || lowerLine.includes('project')) { tier = 2; }
      results.push({ id: `saints_import_${i}_${Date.now()}`, name: line.length \u003e 80 ? line.substring(0, 80) + '...' : line, tier, domain });
    });
    setSaintsPortalParsed(results.slice(0, 20));
  };

  const handleEnrollClick = async (item: Opportunity) =\u003e {
    if (!enrollJustification.trim()) {
      showNotification(\"A Statement of Interest is required to enroll.\", \"err\");
      setDirectEnrollId(item.id);
      setSelectedItem(item);
      setTimeout(() =\u003e {
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
      \u003cdiv className=\"min-h-screen bg-background flex flex-col items-center justify-center font-body-sm text-on-background\"\u003e
        \u003cdiv className=\"w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4\"\u003e\u003c/div\u003e
        \u003cdiv className=\"font-label-bold text-label-bold text-on-surface-variant\"\u003eLoading your profile...\u003c/div\u003e
      \u003c/div\u003e
    );
  }

  if (showAdminPanel \u0026\u0026 isAdminUser) {
    return (
      \u003cdiv className=\"flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100\"\u003e
        \u003cTopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e
        \u003cSideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e
        
        \u003cmain className=\"flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300\"\u003e
          \u003cDesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} /\u003e
          
          \u003cdiv className=\"w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap\"\u003e
            \u003cdiv className=\"mb-8 flex items-center justify-between\"\u003e
              \u003cdiv\u003e
                \u003ch1 className=\"font-display-xl text-display-xl text-primary\"\u003eTeacher Console\u003c/h1\u003e
                \u003cp className=\"font-body-lg text-body-lg text-on-surface-variant mt-stack-sm text-slate-500\"\u003eManage students, catalog, and view analytics.\u003c/p\u003e
              \u003c/div\u003e
              \u003cbutton onClick={() =\u003e setShowAdminPanel(false)} className=\"px-6 py-2 bg-blue-100/50 text-[#0151B1] font-label-bold text-label-bold rounded-full hover:bg-blue-100 transition-colors uppercase tracking-wider shadow-sm flex items-center gap-2\"\u003e
                \u003cLayoutDashboard className=\"w-4 h-4\" /\u003e Switch to Student View
              \u003c/button\u003e
            \u003c/div\u003e

            {/* Overview Tab */}
            \u003cdiv className={cn(\"flex-col gap-6\", activeTab === 0 ? \"flex animate-fadeIn\" : \"hidden\")}\u003e
              \u003cdiv className=\"grid grid-cols-1 md:grid-cols-3 gap-6\"\u003e
                \u003cdiv className=\"bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4\"\u003e
                  \u003cdiv className=\"w-12 h-12 rounded-full bg-blue-50 text-[#0151B1] flex items-center justify-center shrink-0\"\u003e
                    \u003cUsers className=\"w-6 h-6\" /\u003e
                  \u003c/div\u003e
                  \u003cdiv\u003e
                    \u003ch3 className=\"font-bold text-slate-500 text-sm uppercase tracking-wider\"\u003eTotal Students\u003c/h3\u003e
                    \u003cp className=\"font-display text-3xl font-extrabold text-slate-900 mt-1\"\u003e{users.length}\u003c/p\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
                \u003cdiv className=\"bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4\"\u003e
                  \u003cdiv className=\"w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0\"\u003e
                    \u003cBookOpen className=\"w-6 h-6\" /\u003e
                  \u003c/div\u003e
                  \u003cdiv\u003e
                    \u003ch3 className=\"font-bold text-slate-500 text-sm uppercase tracking-wider\"\u003eActive Courses\u003c/h3\u003e
                    \u003cp className=\"font-display text-3xl font-extrabold text-slate-900 mt-1\"\u003e{catalog.length}\u003c/p\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
                \u003cdiv className=\"bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4\"\u003e
                  \u003cdiv className=\"w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0\"\u003e
                    \u003cTrendingUp className=\"w-6 h-6\" /\u003e
                  \u003c/div\u003e
                  \u003cdiv\u003e
                    \u003ch3 className=\"font-bold text-slate-500 text-sm uppercase tracking-wider\"\u003eEngagement Rate\u003c/h3\u003e
                    \u003cp className=\"font-display text-3xl font-extrabold text-slate-900 mt-1\"\u003e78%\u003c/p\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
              \u003c/div\u003e
              
              \u003cdiv className=\"bg-white border border-slate-200 rounded-2xl p-6 shadow-sm\"\u003e
                \u003ch3 className=\"font-display font-bold text-xl text-slate-900 mb-6\"\u003eRecent Activity Notifications\u003c/h3\u003e
                \u003cdiv className=\"space-y-4\"\u003e
                  {[
                    \"New cohort of 150 students onboarded for 2026 Academic Year.\",
                    \"Course 'Design Thinking Workshop' (Tier 1) updated by admin.\",
                    \"Student progression rate reached new milestone in Science Domain.\",
                    \"System weekly automated backup completed smoothly.\"
                  ].map((act, i) =\u003e (
                    \u003cdiv key={i} className=\"flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100\"\u003e
                      \u003cBell className=\"w-5 h-5 text-slate-400 shrink-0 mt-0.5\" /\u003e
                      \u003cdiv\u003e
                        \u003cp className=\"text-slate-700 font-medium\"\u003e{act}\u003c/p\u003e
                        \u003cp className=\"text-xs text-slate-400 mt-1\"\u003e{i * 2 + 1} hours ago\u003c/p\u003e
                      \u003c/div\u003e
                    \u003c/div\u003e
                  ))}
                \u003c/div\u003e
              \u003c/div\u003e
            \u003c/div\u003e

            {/* Catalog Management Tab */}
            \u003cdiv className={cn(activeTab === 1 ? \"block animate-fadeIn\" : \"hidden\")}\u003e
              \u003cdiv className=\"bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200\"\u003e
                 \u003ch2 className=\"font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4\"\u003eCatalog Management\u003c/h2\u003e
                 \u003cp className=\"font-body-lg text-body-lg text-slate-500 mb-6\"\u003e
                   Upload a JSON/CSV file exported from Google Sheets, or manually seed the database with the default values.
                 \u003c/p\u003e
                 
                 \u003cdiv className=\"flex flex-wrap gap-4\"\u003e
                    {isSuperAdminUser \u0026\u0026 (
                      \u003c\u003e
                        \u003cbutton 
                          onClick={async () =\u003e {
                             const isMock = user.uid.startsWith('mock_');
                             if (isMock) {
                               setCatalog(SEED_COURSES.map(c =\u003e ({ ...c, image: `https://image.pollinations.ai/prompt/${encodeURIComponent(c.name + ' course educational abstract')}?width=600\u0026height=400\u0026nologo=true` } as Opportunity)));
                               showNotification(\"Simulated: Seeded default catalog locally.\", \"success\");
                               return;
                             }
                             handleSeedData();
                           }}
                          className=\"px-6 py-3 bg-[#0151B1] hover:bg-blue-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider\"
                        \u003e
                          Seed Default Catalog Data
                        \u003c/button\u003e
                        
                        \u003cbutton 
                          onClick={async () =\u003e {
                             try {
                               const isMock = user.uid.startsWith('mock_');
                               let b = !isMock ? writeBatch(db) : null;
                               let count = 0;
                               const newCatalog = catalog.map(item =\u003e ({
                                 ...item,
                                 domain: categorizeDomain(item.name)
                               }));

                               if (!isMock \u0026\u0026 b) {
                                 for (const item of catalog) {
                                   b.update(doc(db, 'opportunities', item.id), {
                                     domain: categorizeDomain(item.name)
                                   });
                                   count++;
                                   if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
                                 }
                                 if (count \u003e 0) await b.commit();
                                } else {
                                 setCatalog(newCatalog);
                               }
                               
                               showNotification(isMock ? 'Simulated: Re-mapped all domains locally' : 'Re-mapped all domains successfully', 'success');
                             } catch (e) {
                               handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                             }
                           }}
                          className=\"px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider\"
                        \u003e
                          Auto-Categorize Domains
                        \u003c/button\u003e

                        \u003cbutton 
                          onClick={async () =\u003e {
                            try {
                              showNotification(\"Recalculating enrollments from user data...\", \"success\");
                              const usersSnapshot = await getDocs(collection(db, 'users'));
                              const courseCounts: Record\u003cstring, number\u003e = {};
                              
                              for (const userDoc of usersSnapshot.docs) {
                                const coursesSnap = await getDocs(collection(db, 'users', userDoc.id, 'courses'));
                                coursesSnap.forEach(c =\u003e {
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
                              if (count \u003e 0) await b.commit();
                              showNotification('Enrollments recalculated successfully based on actual user data.', 'success');
                            } catch (e) {
                              handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                            }
                          }}
                          className=\"px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider\"
                        \u003e
                          Sync Actual Enrollments
                        \u003c/button\u003e

                        \u003cbutton 
                          onClick={async () =\u003e {
                            try {
                              const isMock = user.uid.startsWith('mock_');
                              let b = !isMock ? writeBatch(db) : null;
                              let count = 0;
                              const newCatalog = [...catalog];

                              for (let i = 0; i \u003c newCatalog.length; i++) {
                                const item = newCatalog[i];
                                if (!item.image || item.image.includes('dicebear.com') || item.image.includes('loremflickr.com') || item.image.includes('placeholder')) {
                                  const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name + ' course educational abstract')}?width=600\u0026height=400\u0026nologo=true`;
                                  
                                  if (b) {
                                    b.update(doc(db, 'opportunities', item.id), { image: newUrl });
                                  }
                                  
                                  newCatalog[i] = { ...item, image: newUrl };
                                  count++;
                                  
                                  if (b \u0026\u0026 count === 400) { 
                                    await b.commit(); 
                                    b = writeBatch(db); 
                                    count = 0; 
                                  }
                                }
                              }

                              if (b \u0026\u0026 count \u003e 0) {
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
                              console.error(\"Thumbnail Generation Error:\", e);
                              handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                            }
                          }}
                          className=\"px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider flex items-center gap-2\"
                        \u003e
                          \u003cImageIcon className=\"w-4 h-4\" /\u003e Auto-Generate Thumbnails
                        \u003c/button\u003e
                      \u003c/\u003e
                    )}

                    {isSuperAdminUser \u0026\u0026 (
                       \u003clabel className=\"flex items-center justify-center px-6 py-3 border-2 border-dashed border-[#0151B1]/30 rounded-full cursor-pointer hover:border-[#0151B1] hover:bg-blue-50 transition-colors group\"\u003e
                         \u003cinput type=\"file\" className=\"hidden\" accept=\".json,.csv,.xlsx,.xls\" onChange={handleFileUpload} /\u003e
                         \u003cUpload className=\"w-5 h-5 mr-2 text-[#0151B1] transition-colors\" /\u003e
                         \u003cspan className=\"font-label-bold text-label-bold text-[#0151B1] uppercase tracking-wider\"\u003eImport from CSV / JSON / XLSX\u003c/span\u003e
                       \u003c/label\u003e
                    )}
                    \u003cbutton
                      onClick={() =\u003e {
                        setEditingCourseId('new-' + Date.now().toString());
                        setEditingCourseData({ name: '', domain: '', tier: 1, enrolled: 0, capacity: 20 });
                      }}
                      className=\"px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2\"
                    \u003e
                      \u003cPlus className=\"w-5 h-5\"/\u003e Add New Course
                    \u003c/button\u003e
                 \u003c/div\u003e
                 
                 \u003cdiv className=\"mt-8 border-t border-slate-200 pt-8\"\u003e
                   \u003cdiv className=\"flex justify-between items-end mb-4\"\u003e
                     \u003ch3 className=\"font-headline-md text-headline-md font-bold text-slate-900\"\u003eLive Catalog Overview\u003c/h3\u003e
                     \u003cdiv className=\"flex bg-slate-100 p-1 rounded-full\"\u003e
                       \u003cbutton
                         onClick={() =\u003e setCatalogFilterLevel('all')}
                         className={cn(\"px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all\", catalogFilterLevel === 'all' ? \"bg-white text-[#0151B1] shadow-sm\" : \"text-slate-500 hover:text-slate-700\")}
                       \u003e
                         All Courses
                       \u003c/button\u003e
                       \u003cbutton
                         onClick={() =\u003e setCatalogFilterLevel('mine')}
                         className={cn(\"px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all\", catalogFilterLevel === 'mine' ? \"bg-white text-[#0151B1] shadow-sm\" : \"text-slate-500 hover:text-slate-700\")}
                       \u003e
                         Assigned to Me
                       \u003c/button\u003e
                     \u003c/div\u003e
                   \u003c/div\u003e
                   \u003cdiv className=\"h-[500px] overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-inner custom-scrollbar\"\u003e
                      {catalog.length === 0 ? (
                        \u003cdiv className=\"flex flex-col items-center justify-center h-full text-slate-400\"\u003e
                          \u003cDatabase className=\"w-8 h-8 mb-2 opacity-50\" /\u003e
                          \u003cp className=\"font-body-sm text-body-sm\"\u003eCatalog is empty. Please seed or import data.\u003c/p\u003e
                        \u003c/div\u003e
                      ) : (
                        \u003cul className=\"space-y-2\"\u003e
                          {catalog.filter(item =\u003e catalogFilterLevel === 'all' || (item.ownerEmails?.includes(user?.email || ''))).map(item =\u003e (
                            \u003cli key={item.id} className=\"p-3 bg-white border border-slate-200 rounded-lg flex justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors items-center\"\u003e
                              \u003cdiv className=\"flex items-center gap-3\"\u003e
                                \u003cdiv className=\"relative group/thumbnail shrink-0 cursor-pointer\"\u003e
                                  {item.image ? (
                                    \u003c\u003e
                                      \u003cimg src={item.image} alt=\"\" className=\"w-8 h-8 rounded object-cover border border-slate-200\" /\u003e
                                      \u003cdiv className=\"absolute z-50 left-10 top-1/2 -translate-y-1/2 hidden group-hover/thumbnail:block w-48 h-48 bg-white border border-slate-200 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-none\"\u003e
                                        \u003cimg src={item.image} alt=\"\" className=\"w-full h-full object-cover\" /\u003e
                                      \u003c/div\u003e
                                    \u003c/\u003e
                                  ) : (
                                    \u003cdiv className=\"w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200\"\u003e
                                      \u003cImageIcon className=\"w-4 h-4 text-slate-400\" /\u003e
                                    \u003c/div\u003e
                                  )}
                                \u003c/div\u003e
                                \u003cspan className=\"font-body-lg text-body-lg font-semibold text-slate-800\"\u003e{item.name}\u003c/span\u003e
                              \u003c/div\u003e
                              \u003cdiv className=\"flex gap-2 items-center mt-1 flex-wrap\"\u003e
                                \u003cspan className={cn(\"px-2 py-1 text-xs rounded-full font-label-bold text-label-bold\", item.tier === 1 ? \"bg-emerald-100 text-emerald-800\" : item.tier === 2 ? \"bg-blue-100 text-blue-800\" : \"bg-red-100 text-red-800\")}>{getTierName(item.tier)}\u003c/span\u003e
                                \u003cspan className=\"px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-label-bold text-label-bold uppercase tracking-wider border border-slate-200\"\u003e{item.domain}\u003c/span\u003e
                                \u003cspan className=\"px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded-full font-label-bold text-label-bold tracking-wider border border-purple-100\"\u003e
                                  {item.enrolled || 0} Enrolled (Max {item.capacity || 20})
                                \u003c/span\u003e
                                {item.level \u0026\u0026 \u003cspan className=\"px-2 py-1 bg-white text-slate-500 text-[10px] rounded border border-slate-200\"\u003e{item.level}\u003c/span\u003e}
                                {item.term \u0026\u0026 \u003cspan className=\"px-2 py-1 bg-white text-slate-500 text-[10px] rounded border border-slate-200\"\u003e{item.term}{item.week ? `, Wk ${item.week}` : ''}\u003c/span\u003e}
                                
                                {(isSuperAdminUser || (user?.email \u0026\u0026 item.ownerEmails?.includes(user?.email))) \u0026\u0026 (
                                  \u003c\u003e
                                    \u003cbutton
                                      onClick={() =\u003e {
                                        setEditingCourseId(item.id);
                                        setEditingCourseData({
                                          ...item,
                                          description: item.description || 'Master core concepts and practical applications.'
                                        });
                                      }}
                                      className=\"p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors ml-2\"
                                      title=\"Edit Details\"
                                    \u003e
                                      \u003cPencil className=\"w-4 h-4\" /\u003e
                                    \u003c/button\u003e
                                    \u003cbutton
                                      onClick={() =\u003e {
                                        setEditingImageId(item.id);
                                        setEditedImageUrl(item.image || \"\");
                                      }}
                                      className=\"p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors\"
                                      title=\"Edit Thumbnail\"
                                    \u003e
                                      \u003cImageIcon className=\"w-4 h-4\" /\u003e
                                    \u003c/button\u003e
                                    {isSuperAdminUser \u0026\u0026 (
                                      \u003cbutton
                                        onClick={async () =\u003e {
                                          try {
                                            const isMock = user.uid.startsWith('mock_');
                                            if (!isMock) {
                                              await deleteDoc(doc(db, 'opportunities', item.id));
                                            } else {
                                              // Simulated delete
                                              setCatalog(catalog.filter(o =\u003e o.id !== item.id));
                                            }
                                            showNotification('Removed successfully', 'success');
                                          } catch (e) {
                                            handleFirestoreError(e, OperationType.DELETE, 'opportunities');
                                          }
                                        }}
                                        className=\"p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors ml-1\"
                                        title=\"Delete Item\"
                                      \u003e
                                        \u003cX className=\"w-4 h-4\" /\u003e
                                      \u003c/button\u003e
                                    )}
                                  \u003c/\u003e
                                )}
                              \u003c/div\u003e
                            \u003c/li\u003e
                          ))}
                        \u003c/ul\u003e
                      )}
                   \u003c/div\u003e
                 \u003c/div\u003e
              \u003c/div\u003e
            \u003c/div\u003e
            
            {/* Students Tab */}
            \u003cdiv className={cn(\"flex flex-col animate-fadeIn\", activeTab === 2 ? \"flex\" : \"hidden\")}\u003e
                \u003cdiv className=\"bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200\"\u003e
                  \u003ch2 className=\"font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4\"\u003eStudent Directory\u003c/h2\u003e
                  \u003cp className=\"font-body-lg text-body-lg text-slate-500 mb-6\"\u003eManage student profiles and view overall progress records.\u003c/p\u003e
                  
                  \u003cdiv className=\"h-[500px] overflow-y-auto w-full custom-scrollbar\"\u003e
                    \u003ctable className=\"w-full text-left border-collapse\"\u003e
                      \u003cthead\u003e
                        \u003ctr className=\"border-b border-slate-200\"\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider\"\u003eStudent Name\u003c/th\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell\"\u003eEmail\u003c/th\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right\"\u003eAction\u003c/th\u003e
                        \u003c/tr\u003e
                      \u003c/thead\u003e
                      \u003ctbody\u003e
                        {users.map(u =\u003e (
                          \u003ctr key={u.id} className=\"border-b border-slate-100 hover:bg-slate-50 transition-colors\"\u003e
                            \u003ctd className=\"py-4 px-4 font-bold text-slate-900 flex items-center gap-3\"\u003e
                              \u003cdiv className=\"w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs\"\u003e
                                {(u.studentName || 'S').substring(0, 2).toUpperCase()}
                              \u003c/div\u003e
                              {u.studentName || 'Unknown Student'}
                            \u003c/td\u003e
                            \u003ctd className=\"py-4 px-4 text-slate-500 hidden md:table-cell\"\u003e{u.email}\u003c/td\u003e
                            \u003ctd className=\"py-4 px-4 text-right\"\u003e
                              \u003cbutton onClick={() =\u003e showNotification('View Profile feature coming soon', 'success')} className=\"text-blue-600 hover:text-blue-800 font-bold text-sm\"\u003eView Profile\u003c/button\u003e
                            \u003c/td\u003e
                          \u003c/tr\u003e
                        ))}
                      \u003c/tbody\u003e
                    \u003c/table\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
            \u003c/div\u003e

            {/* Requests Tab */}
            \u003cdiv className={cn(\"flex flex-col animate-fadeIn\", activeTab === 3 ? \"flex\" : \"hidden\")}\u003e
                \u003cdiv className=\"bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200\"\u003e
                  \u003ch2 className=\"font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4\"\u003eEnrollment Requests\u003c/h2\u003e
                  \u003cp className=\"font-body-lg text-body-lg text-slate-500 mb-6\"\u003eManage pending student enrollments.\u003c/p\u003e
                  
                  \u003cdiv className=\"h-[500px] overflow-y-auto w-full custom-scrollbar\"\u003e
                    \u003ctable className=\"w-full text-left border-collapse\"\u003e
                      \u003cthead\u003e
                        \u003ctr className=\"border-b border-slate-200\"\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider\"\u003eStudent Name\u003c/th\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider\"\u003eCourse\u003c/th\u003e
                          \u003cth className=\"py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right\"\u003eAction\u003c/th\u003e
                        \u003c/tr\u003e
                      \u003c/thead\u003e
                      \u003ctbody\u003e
                        {users.map(u =\u003e (
                          \u003cPendingUserRequests 
                            key={u.id} 
                            userDoc={u} 
                            catalog={catalog} 
                            showNotification={showNotification} 
                            mockPending={u.id === user.uid \u0026\u0026 user.uid.startsWith('mock_') ? profile.pending : undefined}
                            mockProcessed={u.id === user.uid \u0026\u0026 user.uid.startsWith('mock_') ? [...profile.planned, ...profile.rejected] : undefined}
                            onMockAction={(courseId, action) =\u003e {
                              if (action === 'approve') {
                                const course = profile.pending.find(p =\u003e p.courseId === courseId || p.id === courseId);
                                if (course) {
                                  setProfile(p =\u003e ({
                                    ...p,
                                    pending: p.pending.filter(x =\u003e x.courseId !== courseId \u0026\u0026 x.id !== courseId),
                                    planned: [...p.planned, {...course, status: 'planned'}]
                                  }));
                                }
                              } else if (action === 'reject') {
                                const course = profile.pending.find(p =\u003e p.courseId === courseId || p.id === courseId);
                                if (course) {
                                  setProfile(p =\u003e ({
                                    ...p,
                                    pending: p.pending.filter(x =\u003e x.courseId !== courseId \u0026\u0026 x.id !== courseId),
                                    rejected: [...p.rejected, {...course, status: 'rejected'}]
                                  }));
                                }
                              } else if (action === 'undo') {
                                const plannedCourse = profile.planned.find(p =\u003e p.courseId === courseId || p.id === courseId);
                                const rejectedCourse = profile.rejected.find(p =\u003e p.courseId === courseId || p.id === courseId);
                                const course = plannedCourse || rejectedCourse;
                                if (course) {
                                  setProfile(p =\u003e ({
                                    ...p,
                                    planned: p.planned.filter(x =\u003e x.courseId !== courseId \u0026\u0026 x.id !== courseId),
                                    rejected: p.rejected.filter(x =\u003e x.courseId !== courseId \u0026\u0026 x.id !== courseId),
                                    pending: [...p.pending, {...course, status: 'pending'}]
                                  }));
                                }
                              }
                            }}
                          /\u003e
                        ))}
                      \u003c/tbody\u003e
                    \u003c/table\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
            \u003c/div\u003e

            {/* Analytics Tab */}
            \u003cdiv className={cn(\"flex flex-col animate-fadeIn\", activeTab === 4 ? \"flex\" : \"hidden\")}\u003e
                \u003cdiv className=\"bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200\"\u003e
                  \u003ch2 className=\"font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4\"\u003eSchool Analytics\u003c/h2\u003e
                  \u003cp className=\"font-body-lg text-body-lg text-slate-500 mb-6\"\u003eCurrent performance metrics of the entire cohort.\u003c/p\u003e
                  
                  \u003cdiv className=\"grid grid-cols-1 md:grid-cols-2 gap-6\"\u003e
                    \u003cdiv className=\"bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex flex-col items-center justify-center\"\u003e
                      \u003cdiv className=\"text-sm font-bold text-slate-500 uppercase tracking-widest mb-4\"\u003eDomain Distribution\u003c/div\u003e
                      \u003cdiv className=\"w-full flex items-end justify-around h-32 px-4 gap-2\"\u003e
                        {domainDistribution.topDomains.map(([domain, count], i) =\u003e {
                          const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400'];
                          const textColors = ['text-blue-900', 'text-emerald-900', 'text-purple-900', 'text-amber-900', 'text-rose-900'];
                          return (
                            \u003cdiv key={domain} className=\"flex flex-col items-center justify-end h-full flex-1\"\u003e
                              \u003cdiv className={`w-full max-w-[48px] rounded-t-md flex justify-center text-xs font-bold pt-2 ${colors[i % colors.length]} ${textColors[i % colors.length]}`} style={{ height: `${(count / domainDistribution.max) * 100}%`, minHeight: '20px' }}\u003e
                                {count}
                              \u003c/div\u003e
                              \u003cdiv className=\"text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center px-1\" title={domain}\u003e{domain.substring(0, 8)}\u003c/div\u003e
                            \u003c/div\u003e
                          );
                        })}
                      \u003c/div\u003e
                    \u003c/div\u003e
                    \u003cdiv className=\"bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex flex-col items-center justify-center\"\u003e
                       \u003cTrendingUp className=\"w-12 h-12 text-slate-300 mb-4\" /\u003e
                       \u003cdiv className=\"text-xl font-bold text-slate-700\"\u003eDetailed Report Generation\u003c/div\u003e
                       \u003cbutton className=\"mt-4 px-6 py-2 bg-white border border-slate-200 rounded-full shadow-sm text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors\"\u003eDownload CSV\u003c/button\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
            \u003c/div\u003e

             {/* Settings Tab */}
             \u003cdiv className={cn(\"flex flex-col animate-fadeIn\", activeTab === 5 ? \"flex\" : \"hidden\")}\u003e
                \u003cdiv className=\"bg-white rounded-[2rem] p-8 shadow-[0_4px_30px_rgba(59,130,246,0.03)] border border-slate-200\"\u003e
                  \u003ch2 className=\"font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4\"\u003eSystem Settings\u003c/h2\u003e
                  \u003cp className=\"font-body-lg text-body-lg text-slate-500 mb-6\"\u003eManage global preferences and your admin profile.\u003c/p\u003e

                  \u003cdiv className=\"space-y-6 max-w-xl\"\u003e
                    \u003cdiv className=\"flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100\"\u003e
                      \u003cdiv\u003e
                        \u003cdiv className=\"font-bold text-slate-900\"\u003eAcademic Year\u003c/div\u003e
                        \u003cdiv className=\"text-sm text-slate-500 text-slate-500\"\u003eCurrently set to 2026.\u003c/div\u003e
                      \u003c/div\u003e
                      \u003cbutton className=\"px-4 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-100\"\u003eChange\u003c/button\u003e
                    \u003c/div\u003e

                    \u003cdiv className=\"flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100\"\u003e
                      \u003cdiv\u003e
                        \u003cdiv className=\"font-bold text-slate-900\"\u003eSign Out\u003c/div\u003e
                        \u003cdiv className=\"text-sm text-slate-500 text-slate-500\"\u003eLog out of your administrative session.\u003c/div\u003e
                      \u003c/div\u003e
                      \u003cbutton onClick={() =\u003e signOut(auth)} className=\"px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 font-bold rounded-lg text-sm hover:bg-red-100\"\u003eSign Out\u003c/button\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
            \u003c/div\u003e
            
          \u003c/div\u003e
          {editingCourseId \u0026\u0026 editingCourseData \u0026\u0026 (
            \u003cdiv className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn\"\u003e
              \u003cdiv className=\"bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar\"\u003e
                \u003cbutton 
                  onClick={() =\u003e {
                     setEditingCourseId(null);
                     setEditingCourseData(null);
                  }} 
                  className=\"absolute top-6 right-6 text-slate-400 hover:text-slate-600 focus:outline-none\"
                \u003e
                   \u003cX className=\"w-5 h-5\"/\u003e
                \u003c/button\u003e
                \u003ch2 className=\"text-xl font-bold text-slate-900 mb-6\"\u003eEdit Course Details\u003c/h2\u003e
                
                \u003cdiv className=\"space-y-4\"\u003e
                  \u003cdiv\u003e
                    \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eCourse Name\u003c/label\u003e
                    \u003cinput 
                      type=\"text\" 
                      value={editingCourseData.name || ''} 
                      onChange={(e) =\u003e setEditingCourseData({...editingCourseData, name: e.target.value})}
                      className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none\"
                    /\u003e
                  \u003c/div\u003e
                  
                  \u003cdiv className=\"flex flex-col gap-4\"\u003e
                    \u003cdiv className=\"flex items-center gap-4\"\u003e
                      \u003cdiv className=\"flex-1\"\u003e
                        \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eDomain\u003c/label\u003e
                        \u003cselect 
                          value={editingCourseData.domain || ''} 
                          onChange={(e) =\u003e setEditingCourseData({...editingCourseData, domain: e.target.value})}
                          className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white\"
                        \u003e
                          \u003coption value=\"\"\u003eSelect Domain...\u003c/option\u003e
                          {Array.from(new Set(catalog.map(item =\u003e (item.domain || \"\").trim()))).filter(Boolean).sort().map(d =\u003e (
                            \u003coption key={d} value={d}\u003e{d}\u003c/option\u003e
                          ))}
                        \u003c/select\u003e
                      \u003c/div\u003e
                      \u003cdiv className=\"flex-1\"\u003e
                        \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eTier (Level)\u003c/label\u003e
                        \u003cselect 
                          value={editingCourseData.tier || 1} 
                          onChange={(e) =\u003e setEditingCourseData({...editingCourseData, tier: Number(e.target.value)})}
                          className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white\"
                        \u003e
                          \u003coption value={1}\u003eTier 1\u003c/option\u003e
                          \u003coption value={2}\u003eTier 2\u003c/option\u003e
                          \u003coption value={3}\u003eTier 3\u003c/option\u003e
                        \u003c/select\u003e
                      \u003c/div\u003e
                      \u003cdiv className=\"flex-1\"\u003e
                        \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eCapacity\u003c/label\u003e
                        \u003cinput 
                          type=\"number\"
                          value={editingCourseData.capacity || ''} 
                          onChange={(e) =\u003e setEditingCourseData({...editingCourseData, capacity: parseInt(e.target.value) || 0})}
                          className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white\"
                          placeholder=\"e.g. 40\"
                        /\u003e
                      \u003c/div\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e

                  \u003cdiv className=\"grid grid-cols-3 gap-4\"\u003e
                    \u003cdiv\u003e
                      \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eLevel (e.g. JC1)\u003c/label\u003e
                      \u003cinput 
                        type=\"text\" 
                        value={editingCourseData.level || ''} 
                        onChange={(e) =\u003e setEditingCourseData({...editingCourseData, level: e.target.value})}
                        className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none\"
                      /\u003e
                    \u003c/div\u003e
                    \u003cdiv\u003e
                      \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eTerm\u003c/label\u003e
                      \u003cinput 
                        type=\"text\" 
                        value={editingCourseData.term || ''} 
                        onChange={(e) =\u003e setEditingCourseData({...editingCourseData, term: e.target.value})}
                        className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none\"
                      /\u003e
                    \u003c/div\u003e
                    \u003cdiv\u003e
                      \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eWeek\u003c/label\u003e
                      \u003cinput 
                        type=\"text\" 
                        value={editingCourseData.week || ''} 
                        onChange={(e) =\u003e setEditingCourseData({...editingCourseData, week: e.target.value})}
                        className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none\"
                      /\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e

                  \u003cdiv\u003e
                    \u003cdiv className=\"flex items-center justify-between mb-1\"\u003e
                      \u003clabel className=\"block text-sm font-bold text-slate-700\"\u003eDescription\u003c/label\u003e
                      \u003cbutton
                        onClick={async () =\u003e {
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
                            setEditingCourseData(prev =\u003e ({ ...prev, description: data.description }));
                            showNotification('Description generated', 'success');
                          } catch (err: any) {
                            showNotification(err.message || 'Failed to generate description', 'err');
                          } finally {
                            setIsGeneratingDescription(false);
                          }
                        }}
                        disabled={isGeneratingDescription}
                        className=\"text-xs font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1\"
                      \u003e
                        {isGeneratingDescription ? (
                          \u003cdiv className=\"w-3 h-3 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin\"\u003e\u003c/div\u003e
                        ) : (
                          \u003cFlame className=\"w-3 h-3\" /\u003e
                        )}
                        Auto-Generate
                      \u003c/button\u003e
                    \u003c/div\u003e
                    \u003ctextarea 
                      rows={4}
                      value={editingCourseData.description || ''} 
                      onChange={(e) =\u003e setEditingCourseData({...editingCourseData, description: e.target.value})}
                      className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none\"
                    /\u003e
                  \u003c/div\u003e

                  {isSuperAdminUser \u0026\u0026 (
                    \u003cdiv\u003e
                      \u003clabel className=\"block text-sm font-bold text-slate-700 mb-1\"\u003eAssigned Teachers (Owner Emails, comma separated)\u003c/label\u003e
                      \u003cinput 
                        type=\"text\" 
                        value={editingCourseData.ownerEmails?.join(', ') || ''} 
                        onChange={(e) =\u003e {
                          const emails = e.target.value.split(',').map(em =\u003e em.trim()).filter(em =\u003e em);
                          setEditingCourseData({...editingCourseData, ownerEmails: emails});
                        }}
                        className=\"w-full border border-slate-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none\"
                        placeholder=\"teacher1@sajc.edu.sg, teacher2@sajc.edu.sg\"
                      /\u003e
                      \u003cp className=\"text-[11px] text-slate-500 mt-1.5 font-medium\"\u003eEmails must end with @sajc.edu.sg\u003c/p\u003e
                    \u003c/div\u003e
                  )}

                  \u003cdiv className=\"flex justify-end gap-3 pt-4\"\u003e
                    \u003cbutton 
                      onClick={() =\u003e {
                        setEditingCourseId(null);
                        setEditingCourseData(null);
                      }} 
                      className=\"px-5 py-2.5 rounded-full text-slate-600 font-bold hover:bg-slate-100 transition-colors\"
                    \u003e
                      Cancel
                    \u003c/button\u003e
                    \u003cbutton 
                      onClick={async () =\u003e {
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
                              setCatalog(catalog.map(o =\u003e o.id === editingCourseId ? { ...o, ...editingCourseData } as Opportunity : o));
                            }
                          }
                          showNotification('Changes saved successfully', 'success');
                          setEditingCourseId(null);
                          setEditingCourseData(null);
                        } catch (e) {
                          handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                        }
                      }}
                      className=\"px-8 py-2.5 bg-[#0151B1] text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-all\"
                    \u003e
                      Save Changes
                    \u003c/button\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
              \u003c/div\u003e
            \u003c/div\u003e
          )}
        \u003c/main\u003e
        \u003cBottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e
      \u003c/div\u003e
    );
  }

  return (
    \u003cdiv className=\"flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100\"\u003e
      \u003cTopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e
      \u003cSideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e
      
      \u003cmain className=\"flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300\"\u003e
        \u003cDesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} /\u003e
        
        \u003cdiv className=\"w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap\"\u003e
          \u003cdiv className={cn(\"grid grid-cols-1 lg:grid-cols-12 gap-8\", focusMode \u0026\u0026 \"lg:grid-cols-1\")}\u003e
            
            {/* Left Column: Explorer */}
            \u003cdiv className={cn(\"lg:col-span-8 flex flex-col gap-8\", focusMode \u0026\u0026 \"hidden md:flex\")}\u003e
               \u003csection\u003e
                  \u003cdiv className=\"flex items-end justify-between mb-8 px-1\"\u003e
                    \u003cdiv\u003e
                      \u003ch2 className=\"font-display-xl text-display-xl text-primary\"\u003eOpportunity Explorer\u003c/h2\u003e
                      \u003cp className=\"font-body-lg text-body-lg text-on-surface-variant mt-stack-sm text-slate-500\"\u003eDiscover Tier 1 to 3 growth opportunities.\u003c/p\u003e
                    \u003c/div\u003e
                    \u003cbutton onClick={() =\u003e setShowFilters(!showFilters)} className={cn(\"flex items-center gap-2 px-4 py-2 rounded-full border transition-all font-label-bold text-label-bold uppercase tracking-wider\", showFilters ? \"bg-blue-50 border-blue-200 text-[#0151B1]\" : \"bg-white border-slate-200 text-slate-600 hover:border-slate-300\")}\u003e
                      \u003cSearch className=\"w-4 h-4\" /\u003e Filter \u0026 Search
                    \u003c/button\u003e
                  \u003c/div\u003e

                  {showFilters \u0026\u0026 (
                    \u003cdiv className=\"bg-white rounded-3xl p-6 mb-8 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-fadeIn\"\u003e
                       \u003cdiv className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\"\u003e
                          \u003cdiv\u003e
                            \u003clabel className=\"block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2\"\u003eSearch\u003c/label\u003e
                            \u003cinput type=\"text\" placeholder=\"Search keywords...\" value={search} onChange={(e) =\u003e setSearch(e.target.value)} className=\"w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none\" /\u003e
                          \u003c/div\u003e
                          \u003cdiv\u003e
                            \u003clabel className=\"block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2\"\u003eTier\u003c/label\u003e
                            \u003cselect value={tierFilter} onChange={(e) =\u003e setTierFilter(e.target.value)} className=\"w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none\"\u003e
                              \u003coption value=\"all\"\u003eAll Tiers\u003c/option\u003e
                              \u003coption value=\"1\"\u003eTier 1 (Awareness)\u003c/option\u003e
                              \u003coption value=\"2\"\u003eTier 2 (Develop)\u003c/option\u003e
                              \u003coption value=\"3\"\u003eTier 3 (Deepen)\u003c/option\u003e
                            \u003c/select\u003e
                          \u003c/div\u003e
                          \u003cdiv\u003e
                            \u003clabel className=\"block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2\"\u003eLevel\u003c/label\u003e
                            \u003cselect value={levelFilter} onChange={(e) =\u003e setLevelFilter(e.target.value)} className=\"w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none\"\u003e
                              \u003coption value=\"all\"\u003eAll Levels\u003c/option\u003e
                              {filterOptions.levels.map(l =\u003e \u003coption key={l} value={l}\u003e{l}\u003c/option\u003e)}
                            \u003c/select\u003e
                          \u003c/div\u003e
                          \u003cdiv\u003e
                            \u003clabel className=\"block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2\"\u003eTerm\u003c/label\u003e
                            \u003cselect value={termFilter} onChange={(e) =\u003e setTermFilter(e.target.value)} className=\"w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 outline-none appearance-none\"\u003e
                              \u003coption value=\"all\"\u003eAll Terms\u003c/option\u003e
                              {filterOptions.terms.map(t =\u003e \u003coption key={t} value={t}\u003e{t}\u003c/option\u003e)}
                            \u003c/select\u003e
                          \u003c/div\u003e
                       \u003c/div\u003e
                       
                       \u003cdiv className=\"mt-6 flex flex-wrap gap-2\"\u003e
                         {['STEM \u0026 Innovation', 'Leadership \u0026 Service', 'Aesthetics \u0026 Culture', 'Physical \u0026 Sports', 'Global Awareness'].map(domain =\u003e {
                           const active = domainFilters.includes(domain.toLowerCase());
                           return (
                             \u003cbutton key={domain} onClick={() =\u003e setDomainFilters(prev =\u003e active ? prev.filter(d =\u003e d !== domain.toLowerCase()) : [...prev, domain.toLowerCase()])} className={cn(\"px-4 py-1.5 rounded-full text-xs font-label-bold transition-all border\", active ? \"bg-[#0151B1] border-[#0151B1] text-white shadow-md\" : \"bg-white border-slate-200 text-slate-500 hover:border-slate-300\")}\u003e
                               {domain}
                             \u003c/button\u003e
                           );
                         })}
                       \u003c/div\u003e
                       
                       \u003cdiv className=\"mt-6 flex items-center justify-between border-t border-slate-100 pt-4\"\u003e
                         \u003cdiv className=\"flex items-center gap-4\"\u003e
                            \u003clabel className=\"flex items-center gap-2 cursor-pointer group\"\u003e
                              \u003cdiv className={cn(\"w-4 h-4 rounded border transition-all flex items-center justify-center\", showBookmarksOnly ? \"bg-[#0151B1] border-[#0151B1]\" : \"border-slate-300 group-hover:border-slate-400\")}\u003e
                                \u003cinput type=\"checkbox\" className=\"hidden\" checked={showBookmarksOnly} onChange={() =\u003e setShowBookmarksOnly(!showBookmarksOnly)} /\u003e
                                {showBookmarksOnly \u0026\u0026 \u003cdiv className=\"w-1.5 h-1.5 bg-white rounded-full\"\u003e\u003c/div\u003e}
                              \u003c/div\u003e
                              \u003cspan className=\"text-xs font-bold text-slate-500 uppercase tracking-widest\"\u003eShow Bookmarks Only\u003c/span\u003e
                            \u003c/label\u003e
                         \u003c/div\u003e
                         \u003cbutton onClick={() =\u003e { setSearch(\"\"); setTierFilter(\"all\"); setLevelFilter(\"all\"); setTermFilter(\"all\"); setDomainFilters([]); setShowBookmarksOnly(false); }} className=\"text-xs font-bold text-slate-400 hover:text-[#0151B1] transition-colors uppercase tracking-widest\"\u003eClear All\u003c/button\u003e
                       \u003c/div\u003e
                    \u003c/div\u003e
                  )}

                  \u003cdiv className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn\"\u003e
                    {filteredCatalog.map((item, idx) =\u003e {
                      const isLocked = isTierLocked(item);
                      const isPlanned = profile.planned.some(p =\u003e p.id === item.id);
                      const isCompleted = profile.completed.some(c =\u003e c.id === item.id);
                      const isPending = profile.pending.some(p =\u003e p.id === item.id);
                      const isBookmarked = profile.bookmarks.some(b =\u003e b.id === item.id);
                      
                      return (
                        \u003cdiv 
                          key={item.id} 
                          onClick={() =\u003e setSelectedItem(item)}
                          className={cn(
                            \"group relative bg-white rounded-[2rem] overflow-hidden border border-slate-200 hover:border-[#0151B1]/30 hover:shadow-[0_10px_30px_rgba(1,81,177,0.08)] transition-all duration-500 cursor-pointer flex flex-col h-full\",
                            isLocked \u0026\u0026 \"opacity-75 grayscale-[0.3]\"
                          )}
                        \u003e
                          {/* Thumbnail */}
                          \u003cdiv className=\"relative h-40 overflow-hidden\"\u003e
                            \u003cimg 
                              src={item.image || `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name + ' course educational abstract')}?width=600\u0026height=400\u0026nologo=true`} 
                              alt=\"\" 
                              className=\"w-full h-full object-cover group-hover:scale-105 transition-transform duration-700\" 
                            /\u003e
                            \u003cdiv className=\"absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60\"\u003e\u003c/div\u003e
                            
                            \u003cdiv className=\"absolute top-4 left-4 flex gap-2\"\u003e
                               \u003cspan className={cn(
                                 \"px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-wider text-white backdrop-blur-md border border-white/20 shadow-sm\",
                                 item.tier === 1 ? \"bg-emerald-500/80\" : item.tier === 2 ? \"bg-blue-500/80\" : \"bg-red-500/80\"
                               )}\u003e
                                 {getTierName(item.tier)}
                               \u003c/span\u003e
                            \u003c/div\u003e
                            
                            \u003cbutton 
                              onClick={(e) =\u003e { e.stopPropagation(); handleToggleBookmark(item); }}
                              className={cn(
                                \"absolute top-4 right-4 p-2 rounded-full backdrop-blur-md border border-white/20 transition-all hover:scale-110\",
                                isBookmarked ? \"bg-amber-500/90 text-white\" : \"bg-white/20 text-white hover:bg-white/40\"
                              )}
                            \u003e
                              \u003cStar className={cn(\"w-3.5 h-3.5\", isBookmarked \u0026\u0026 \"fill-current\")} /\u003e
                            \u003c/button\u003e

                            {isLocked \u0026\u0026 (
                               \u003cdiv className=\"absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px]\"\u003e
                                 \u003cLock className=\"w-8 h-8 text-white/90 mb-2\" /\u003e
                                 \u003cspan className=\"text-white font-label-bold text-label-bold uppercase tracking-widest text-[10px]\"\u003ePrerequisite Needed\u003c/span\u003e
                               \u003c/div\u003e
                            )}
                          \u003c/div\u003e

                          {/* Content */}
                          \u003cdiv className=\"p-6 flex flex-col flex-1\"\u003e
                            \u003cdiv className=\"text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2 flex justify-between items-center\"\u003e
                               {item.domain}
                               {isCompleted \u0026\u0026 \u003cspan className=\"flex items-center gap-1 text-emerald-600\"\u003e\u003cCheckCircle2 className=\"w-3 h-3\"/\u003e Done\u003c/span\u003e}
                               {isPlanned \u0026\u0026 \u003cspan className=\"flex items-center gap-1 text-blue-500\"\u003e\u003cClock className=\"w-3 h-3\"/\u003e Planned\u003c/span\u003e}
                               {isPending \u0026\u0026 \u003cspan className=\"flex items-center gap-1 text-amber-500\"\u003e\u003cClock className=\"w-3 h-3\"/\u003e Pending\u003c/span\u003e}
                            \u003c/div\u003e
                            \u003ch3 className=\"font-headline-md text-headline-md font-bold text-slate-900 leading-tight mb-2 group-hover:text-[#0151B1] transition-colors line-clamp-2\"\u003e{item.name}\u003c/h3\u003e
                            \u003cp className=\"text-body-sm text-on-surface-variant line-clamp-2 mb-4 text-slate-500\"\u003e{item.description || 'Master core competencies through hands-on learning and collaborative projects.'}\u003c/p\u003e
                            
                            \u003cdiv className=\"mt-auto pt-4 flex items-center justify-between border-t border-slate-50\"\u003e
                              \u003cdiv className=\"flex items-center gap-1.5\"\u003e
                                \u003cUsers className=\"w-3.5 h-3.5 text-slate-400\" /\u003e
                                \u003cspan className=\"text-[11px] font-bold text-slate-500\"\u003e{item.enrolled || 0} / {item.capacity || 20}\u003c/span\u003e
                              \u003c/div\u003e
                              \u003cdiv className=\"flex items-center gap-1.5\"\u003e
                                \u003cCalendar className=\"w-3.5 h-3.5 text-slate-400\" /\u003e
                                \u003cspan className=\"text-[11px] font-bold text-slate-500\"\u003e{item.term || 'T1'} - {item.level || 'JC1'}\u003c/span\u003e
                              \u003c/div\u003e
                            \u003c/div\u003e
                          \u003c/div\u003e
                        \u003c/div\u003e
                      );
                    })}
                  \u003c/div\u003e

                  {filteredCatalog.length === 0 \u0026\u0026 (
                    \u003cdiv className=\"py-20 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200\"\u003e
                       \u003cBookOpen className=\"w-12 h-12 mb-4 opacity-20\" /\u003e
                       \u003cp className=\"font-bold\"\u003eNo opportunities found matching your filters.\u003c/p\u003e
                       \u003cbutton onClick={() =\u003e { setSearch(\"\"); setTierFilter(\"all\"); setLevelFilter(\"all\"); setTermFilter(\"all\"); setDomainFilters([]); setShowBookmarksOnly(false); }} className=\"mt-4 text-blue-600 font-bold hover:underline\"\u003eReset all filters\u003c/button\u003e
                    \u003c/div\u003e
                  )}
               \u003c/section\u003e
            \u003c/div\u003e

            {/* Right Column: Roadmap \u0026 Profile */}
            \u003cdiv className={cn(\"lg:col-span-4 flex flex-col gap-8\", focusMode \u0026\u0026 \"lg:col-span-12\")}\u003e
               
               {/* Stats Widget */}
               \u003csection className=\"bg-[#0151B1] rounded-[2.5rem] p-8 text-white shadow-[0_20px_50px_rgba(1,81,177,0.2)] relative overflow-hidden group\"\u003e
                  \u003cdiv className=\"absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000\"\u003e\u003c/div\u003e
                  \u003cdiv className=\"relative z-10\"\u003e
                    \u003cdiv className=\"flex items-center gap-3 mb-6\"\u003e
                      \u003cdiv className=\"w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center\"\u003e
                        \u003cTrendingUp className=\"w-5 h-5 text-white\" /\u003e
                      \u003c/div\u003e
                      \u003cdiv\u003e
                        \u003ch2 className=\"text-xs font-bold uppercase tracking-[0.2em] text-blue-100/80\"\u003eTalent Development\u003c/h2\u003e
                        \u003cp className=\"text-sm font-bold\"\u003eTier Progression\u003c/p\u003e
                      \u003c/div\u003e
                    \u003c/div\u003e

                    \u003cdiv className=\"grid grid-cols-3 gap-4 mb-8\"\u003e
                      \u003cdiv className=\"text-center\"\u003e
                        \u003cdiv className=\"text-2xl font-display font-black\"\u003e{profile.completed.filter(c =\u003e c.tier === 1).length + profile.planned.filter(c =\u003e c.tier === 1).length}\u003c/div\u003e
                        \u003cdiv className=\"text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1\"\u003eTier 1\u003c/div\u003e
                      \u003c/div\u003e
                      \u003cdiv className=\"text-center border-x border-white/10\"\u003e
                        \u003cdiv className=\"text-2xl font-display font-black\"\u003e{profile.completed.filter(c =\u003e c.tier === 2).length + profile.planned.filter(c =\u003e c.tier === 2).length}\u003c/div\u003e
                        \u003cdiv className=\"text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1\"\u003eTier 2\u003c/div\u003e
                      \u003c/div\u003e
                      \u003cdiv className=\"text-center\"\u003e
                        \u003cdiv className=\"text-2xl font-display font-black\"\u003e{profile.completed.filter(c =\u003e c.tier === 3).length + profile.planned.filter(c =\u003e c.tier === 3).length}\u003c/div\u003e
                        \u003cdiv className=\"text-[10px] font-bold uppercase tracking-widest text-blue-200 mt-1\"\u003eTier 3\u003c/div\u003e
                      \u003c/div\u003e
                    \u003c/div\u003e

                    \u003cdiv className=\"bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10\"\u003e
                       \u003cdiv className=\"flex justify-between items-center mb-2\"\u003e
                         \u003cspan className=\"text-[10px] font-bold uppercase tracking-wider\"\u003eGrowth Balance\u003c/span\u003e
                         \u003cspan className=\"text-[10px] font-bold\"\u003e{Math.round(((profile.completed.length + profile.planned.length) / 15) * 100)}%\u003c/span\u003e
                       \u003c/div\u003e
                       \u003cdiv className=\"w-full h-1.5 bg-white/20 rounded-full overflow-hidden\"\u003e
                         \u003cdiv className=\"h-full bg-emerald-400 transition-all duration-1000\" style={{ width: `${Math.min(100, ((profile.completed.length + profile.planned.length) / 15) * 100)}%` }}\u003e\u003c/div\u003e
                       \u003c/div\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
               \u003c/section\u003e

               {/* Growth Radar Chart */}
               \u003csection className=\"bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm\"\u003e
                  \u003ch3 className=\"font-bold text-slate-900 mb-6 flex items-center gap-2\"\u003e
                    \u003cStar className=\"w-5 h-5 text-amber-500\" /\u003e Growth Profile
                  \u003ch3/\u003e
                  \u003cdiv className=\"h-64 w-full\"\u003e
                    \u003cResponsiveContainer width=\"100%\" height=\"100%\"\u003e
                      \u003cRadarChart cx=\"50%\" cy=\"50%\" outerRadius=\"80%\" data={chartData}\u003e
                        \u003cPolarGrid stroke=\"#E2E8F0\" /\u003e
                        \u003cPolarAngleAxis dataKey=\"subject\" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} /\u003e
                        \u003cRadar name=\"Talent Progression\" dataKey=\"Completed\" stroke=\"#0151B1\" fill=\"#0151B1\" fillOpacity={0.6} /\u003e
                        \u003cRadar name=\"Planned\" dataKey=\"Planned\" stroke=\"#3B82F6\" fill=\"#3B82F6\" fillOpacity={0.2} /\u003e
                      \u003c/RadarChart\u003e
                    \u003c/ResponsiveContainer\u003e
                  \u003c/div\u003e
                  \u003cdiv className=\"mt-4 p-4 rounded-2xl bg-blue-50 border border-blue-100\"\u003e
                    \u003cp className=\"text-xs text-blue-900 leading-relaxed\"\u003e
                      \u003cspan className=\"font-bold\"\u003eGrowth Insight:\u003c/span\u003e Your strongest development is in \u003cspan className=\"font-bold text-blue-700\"\u003e{topDomain?.subject || 'STEM'}\u003c/span\u003e. Consider exploring Aesthetic options to balance your profile.
                    \u003c/p\u003e
                  \u003c/div\u003e
               \u003c/section\u003e

               {/* Roadmap Widget */}
               \u003csection className=\"flex-1 flex flex-col min-h-[500px]\"\u003e
                  \u003cdiv className=\"flex items-center justify-between mb-6 px-1\"\u003e
                    \u003ch3 className=\"font-display font-bold text-xl text-slate-900\"\u003eMy Roadmap\u003c/h3\u003e
                    \u003cspan className=\"px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest\"\u003e{profile.planned.length} Items\u003c/span\u003e
                  \u003c/div\u003e

                  \u003cdiv className=\"bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden relative\"\u003e
                    {/* Roadmap Timeline */}
                    \u003cdiv className=\"absolute left-8 top-10 bottom-10 w-px bg-slate-100\"\u003e\u003c/div\u003e
                    
                    \u003cdiv className=\"flex-1 p-6 overflow-y-auto custom-scrollbar relative z-10\"\u003e
                      {profile.planned.length === 0 \u0026\u0026 profile.pending.length === 0 ? (
                        \u003cdiv className=\"flex flex-col items-center justify-center h-full text-center py-12 px-6\"\u003e
                          \u003cdiv className=\"w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 opacity-50\"\u003e
                            \u003cPlus className=\"w-8 h-8 text-slate-300\" /\u003e
                          \u003c/div\u003e
                          \u003ch4 className=\"font-bold text-slate-400 uppercase tracking-widest text-xs mb-2\"\u003eYour Journey Starts Here\u003c/h4\u003e
                          \u003cp className=\"text-sm text-slate-400\"\u003eEnroll in courses from the explorer to see your progression roadmap.\u003c/p\u003e
                          \u003cbutton onClick={() =\u003e setActiveTab(0)} className=\"mt-6 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline\"\u003eExplore Opportunities\u003c/button\u003e
                        \u003c/div\u003e
                      ) : (
                        \u003cDndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}\u003e
                          \u003cSortableContext items={profile.planned.map(p =\u003e p.id)} strategy={verticalListSortingStrategy}\u003e
                            \u003cdiv className=\"space-y-4\"\u003e
                               {profile.pending.map((item) =\u003e (
                                 \u003cdiv key={item.id} className=\"relative pl-10 animate-pulse\"\u003e
                                    \u003cdiv className=\"absolute left-[7px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-amber-400 bg-white z-20\"\u003e\u003c/div\u003e
                                    \u003cdiv className=\"bg-amber-50/50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between\"\u003e
                                       \u003cdiv\u003e
                                          \u003cdiv className=\"text-[9px] font-bold text-amber-600 uppercase tracking-widest\"\u003ePending Approval\u003c/div\u003e
                                          \u003cdiv className=\"font-bold text-slate-700 text-sm\"\u003e{item.name}\u003c/div\u003e
                                       \u003c/div\u003e
                                       \u003cbutton onClick={() =\u003e handleRemoveItem(item.id)} className=\"p-1.5 hover:bg-amber-100 rounded-lg text-amber-400 transition-colors\"\u003e
                                         \u003cX className=\"w-3.5 h-3.5\" /\u003e
                                       \u003c/button\u003e
                                    \u003c/div\u003e
                                 \u003c/div\u003e
                               ))}
                               {profile.planned.map((item) =\u003e (
                                 \u003cSortablePlannedItem key={item.id} item={item} onRemove={handleRemoveItem} onComplete={setConfirmCompleteItem} /\u003e
                               ))}
                            \u003c/div\u003e
                          \u003c/SortableContext\u003e
                        \u003c/DndContext\u003e
                      )}
                    \u003c/div\u003e

                    \u003cdiv className=\"p-6 bg-slate-50 border-t border-slate-100\"\u003e
                       \u003cbutton 
                         onClick={() =\u003e setShowSaintsImport(true)}
                         className=\"w-full py-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex items-center justify-center gap-3 hover:border-blue-200 hover:shadow-md transition-all group\"
                       \u003e
                         \u003cdiv className=\"w-8 h-8 rounded-full bg-blue-50 text-[#0151B1] flex items-center justify-center group-hover:bg-[#0151B1] group-hover:text-white transition-colors\"\u003e
                           \u003cPlus className=\"w-4 h-4\" /\u003e
                         \u003c/div\u003e
                         \u003cspan className=\"font-label-bold text-label-bold text-slate-600 uppercase tracking-widest\"\u003eImport from Saints Portal\u003c/span\u003e
                       \u003c/button\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
               \u003c/section\u003e

            \u003c/div\u003e
          \u003c/div\u003e
        \u003c/div\u003e
      \u003c/main\u003e

      \u003cBottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} /\u003e

      {/* Item Detail Modal */}
      {selectedItem \u0026\u0026 (
         \u003cdiv className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn\"\u003e
            \u003cdiv className=\"bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-slideUp\"\u003e
               \u003cbutton onClick={() =\u003e {setSelectedItem(null); setIsEnrolling(false); setEnrollJustification('');}} className=\"absolute top-6 right-6 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white md:text-slate-400 md:bg-transparent transition-all z-10\"\u003e
                 \u003cX className=\"w-6 h-6\" /\u003e
               \u003c/button\u003e
               
               \u003cdiv className=\"flex flex-col md:flex-row h-full\"\u003e
                 \u003cdiv className=\"md:w-1/2 h-48 md:h-auto relative\"\u003e
                   \u003cimg src={selectedItem.image || `https://image.pollinations.ai/prompt/${encodeURIComponent(selectedItem.name + ' course educational abstract')}?width=600\u0026height=400\u0026nologo=true`} className=\"w-full h-full object-cover\" alt=\"\" /\u003e
                   \u003cdiv className=\"absolute inset-0 bg-gradient-to-t from-black/60 via-transparent md:bg-gradient-to-r md:from-transparent md:to-white/10\"\u003e\u003c/div\u003e
                 \u003c/div\u003e
                 
                 \u003cdiv className=\"md:w-1/2 p-8 md:p-10 flex flex-col\"\u003e
                    \u003cdiv className=\"flex items-center gap-2 mb-4\"\u003e
                      \u003cspan className={cn(
                        \"px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-widest text-white shadow-sm\",
                        selectedItem.tier === 1 ? \"bg-emerald-500\" : selectedItem.tier === 2 ? \"bg-blue-500\" : \"bg-red-500\"
                      )}\u003e
                        {getTierName(selectedItem.tier)}
                      \u003c/span\u003e
                      \u003cspan className=\"px-3 py-1 rounded-full text-[10px] font-label-bold text-label-bold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200\"\u003e
                        {selectedItem.domain}
                      \u003c/span\u003e
                    \u003c/div\u003e

                    \u003ch2 className=\"font-display font-black text-2xl text-slate-900 leading-tight mb-4\"\u003e{selectedItem.name}\u003c/h2\u003e
                    \u003cp className=\"text-slate-500 text-sm leading-relaxed mb-6\"\u003e{selectedItem.description || 'Master core competencies through hands-on learning and collaborative projects. This course focuses on building industry-relevant skills.'}\u003c/p\u003e
                    
                    \u003cdiv className=\"space-y-4 mb-8\"\u003e
                       \u003cdiv className=\"flex items-center gap-3\"\u003e
                         \u003cdiv className=\"w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100\"\u003e
                            \u003cCalendar className=\"w-4 h-4\" /\u003e
                         \u003c/div\u003e
                         \u003cdiv\u003e
                            \u003cdiv className=\"text-[10px] font-bold text-slate-400 uppercase tracking-widest\"\u003eSchedule\u003c/div\u003e
                            \u003cdiv className=\"text-xs font-bold text-slate-700\"\u003e{selectedItem.term || 'Term 1'}, {selectedItem.week ? `Week ${selectedItem.week}` : 'Full Term'}\u003c/div\u003e
                         \u003c/div\u003e
                       \u003c/div\u003e
                       \u003cdiv className=\"flex items-center gap-3\"\u003e
                         \u003cdiv className=\"w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100\"\u003e
                            \u003cUsers className=\"w-4 h-4\" /\u003e
                         \u003c/div\u003e
                         \u003cdiv\u003e
                            \u003cdiv className=\"text-[10px] font-bold text-slate-400 uppercase tracking-widest\"\u003eAvailability\u003c/div\u003e
                            \u003cdiv className=\"text-xs font-bold text-slate-700\"\u003e{selectedItem.enrolled || 0} / {selectedItem.capacity || 20} slots filled\u003c/div\u003e
                         \u003c/div\u003e
                       \u003c/div\u003e
                    \u003c/div\u003e

                    \u003cdiv className=\"mt-auto\"\u003e
                       {isTierLocked(selectedItem) \u0026\u0026 (
                         \u003cdiv className=\"p-4 rounded-2xl bg-red-50 border border-red-100 mb-4\"\u003e
                            \u003cdiv className=\"flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest mb-1\"\u003e
                               \u003cLock className=\"w-3.5 h-3.5\" /\u003e Tier Locked
                            \u003c/div\u003e
                            \u003cp className=\"text-[11px] text-red-700 leading-relaxed\"\u003e{getLockReason(selectedItem)}\u003c/p\u003e
                            {getUnlockSuggestions(selectedItem).length \u003e 0 \u0026\u0026 (
                               \u003cdiv className=\"mt-3 pt-3 border-t border-red-100\"\u003e
                                 \u003cp className=\"text-[10px] font-bold text-red-800 mb-2 uppercase tracking-tight\"\u003eSuggested Prerequisites:\u003c/p\u003e
                                 \u003cdiv className=\"flex flex-col gap-2\"\u003e
                                   {getUnlockSuggestions(selectedItem).map(s \u003d\u003e (
                                     \u003cbutton key={s.id} onClick={() \u003d\u003e setSelectedItem(s)} className=\"text-left text-[11px] font-bold text-red-600 hover:underline flex items-center gap-1.5\"\u003e
                                       \u003cChevronRight className=\"w-3 h-3\" /\u003e {s.name}
                                     \u003c/button\u003e
                                   ))}
                                 \u003c/div\u003e
                               \u003c/div\u003e
                            )}
                         \u003c/div\u003e
                       )}

                       {isEnrolling ? (
                         \u003cdiv className=\"space-y-4 animate-fadeIn\"\u003e
                           \u003cdiv\u003e
                             \u003clabel className=\"block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2\"\u003eStatement of Interest\u003c/label\u003e
                             \u003ctextarea 
                               autoFocus
                               value={enrollJustification}
                               onChange={(e) =\u003e setEnrollJustification(e.target.value)}
                               placeholder=\"Explain why you want to enroll (at least 10 words)...\"
                               className=\"w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none h-24\"
                             /\u003e
                           \u003c/div\u003e
                           \u003cdiv className=\"flex gap-3\"\u003e
                             \u003cbutton onClick={() =\u003e setIsEnrolling(false)} className=\"flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all\"\u003eBack\u003c/button\u003e
                             \u003cbutton 
                               onClick={() =\u003e handleEnrollClick(selectedItem)}
                               className=\"flex-1 py-3 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all\"\u003eConfirm\u003c/button\u003e
                           \u003c/div\u003e
                         \u003c/div\u003e
                       ) : (
                         \u003cdiv className=\"flex gap-3\"\u003e
                           \u003cbutton 
                             disabled={isTierLocked(selectedItem) || profile.planned.some(p =\u003e p.id === selectedItem.id) || profile.completed.some(c =\u003e c.id === selectedItem.id) || profile.pending.some(p =\u003e p.id === selectedItem.id)}
                             onClick={() =\u003e setIsEnrolling(true)}
                             className=\"flex-1 py-4 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:bg-slate-200 disabled:shadow-none\"\u003e
                             {profile.planned.some(p =\u003e p.id === selectedItem.id) || profile.completed.some(c =\u003e c.id === selectedItem.id) ? 'Already Enrolled' : profile.pending.some(p =\u003e p.id === selectedItem.id) ? 'Pending Approval' : isTierLocked(selectedItem) ? 'Requirement Locked' : 'Enroll Now'}
                           \u003c/button\u003e
                         \u003c/div\u003e
                       )}
                    \u003c/div\u003e
                 \u003c/div\u003e
               \u003c/div\u003e
            \u003c/div\u003e
         \u003c/div\u003e
      )}

      {/* Saints Portal Import Modal */}
      {showSaintsImport \u0026\u0026 (
         \u003cdiv className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn\"\u003e
            \u003cdiv className=\"bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative p-8\"\u003e
               \u003ch2 className=\"font-display font-black text-2xl text-slate-900 mb-2\"\u003eSaints Portal Sync\u003c/h2\u003e
               \u003cp className=\"text-slate-500 text-sm mb-6\"\u003ePaste your record from Saints Portal to auto-populate your roadmap.\u003c/p\u003e
               
               \u003ctextarea 
                 className=\"w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none mb-6\"
                 placeholder=\"Paste your records here (e.g. Science Olympiad, Prefect Council...)\"
                 value={saintsPortalText}
                 onChange={(e) =\u003e setSaintsPortalText(e.target.value)}
               /\u003e

               {saintsPortalParsed \u0026\u0026 (
                 \u003cdiv className=\"mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100\"\u003e
                    \u003ch3 className=\"font-bold text-blue-900 text-xs uppercase tracking-widest mb-3\"\u003eDetected Progression Items ({saintsPortalParsed.length})\u003c/h3\u003e
                    \u003cdiv className=\"max-h-32 overflow-y-auto space-y-2\"\u003e
                      {saintsPortalParsed.map((item, idx) =\u003e (
                        \u003cdiv key={idx} className=\"flex items-center justify-between bg-white/80 p-2 rounded-lg\"\u003e
                          \u003cspan className=\"text-xs font-bold text-slate-700 truncate\"\u003e{item.name}\u003c/span\u003e
                          \u003cspan className=\"px-2 py-0.5 bg-blue-100 text-[#0151B1] text-[9px] font-bold rounded-full\"\u003eTier {item.tier}\u003c/span\u003e
                        \u003c/div\u003e
                      ))}
                    \u003c/div\u003e
                 \u003c/div\u003e
               )}

               \u003cdiv className=\"flex gap-3\"\u003e
                 \u003cbutton onClick={() =\u003e {setShowSaintsImport(false); setSaintsPortalParsed(null); setSaintsPortalText(\"\");}} className=\"flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all\"\u003eCancel\u003c/button\u003e
                 {!saintsPortalParsed ? (
                   \u003cbutton onClick={autoParseSaintsPortalData} className=\"flex-1 py-3 bg-[#0151B1] text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all\"\u003eScan Records\u003c/button\u003e
                 ) : (
                   \u003cbutton 
                    onClick={() =\u003e {
                      setProfile(p =\u003e ({
                        ...p,
                        completed: [...p.completed, ...saintsPortalParsed]
                      }));
                      showNotification(`Successfully imported ${saintsPortalParsed.length} items.`, 'success');
                      setShowSaintsImport(false);
                      setSaintsPortalParsed(null);
                      setSaintsPortalText(\"\");
                    }} 
                    className=\"flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all\"\u003eSync to Profile\u003c/button\u003e
                 )}
               \u003c/div\u003e
            \u003c/div\u003e
         \u003c/div\u003e
      )}

      {/* Completion Modal */}
      {confirmCompleteItem \u0026\u0026 (
         \u003cdiv className=\"fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn\"\u003e
            \u003cdiv className=\"bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-2xl animate-slideUp\"\u003e
               \u003cdiv className=\"w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6\"\u003e
                 \u003cCheckCircle2 className=\"w-10 h-10\" /\u003e
               \u003c/div\u003e
               \u003ch2 className=\"font-display font-black text-2xl text-slate-900 mb-2\"\u003eCourse Completed?\u003c/h2\u003e
               \u003cp className=\"text-slate-500 text-sm mb-8\"\u003eHave you successfully finished \u003cspan className=\"font-bold text-slate-700\"\u003e{confirmCompleteItem.name}\u003c/span\u003e? This will move it to your completed records.\u003c/p\u003e
               \u003cdiv className=\"flex gap-3\"\u003e
                 \u003cbutton onClick={() =\u003e setConfirmCompleteItem(null)} className=\"flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all\"\u003eNot Yet\u003c/button\u003e
                 \u003cbutton 
                  onClick={async () =\u003e {
                    const isMock = user.uid.startsWith('mock_');
                    if (!isMock) {
                      await updateDoc(doc(db, 'users', user.uid, 'courses', confirmCompleteItem.id), { status: 'completed', completedAt: serverTimestamp() });
                    } else {
                      setProfile(p =\u003e ({
                        ...p,
                        planned: p.planned.filter(x =\u003e x.id !== confirmCompleteItem.id),
                        completed: [...p.completed, { ...confirmCompleteItem, status: 'completed' }]
                      }));
                    }
                    showNotification('Well done! Course moved to completed.', 'success');
                    setConfirmCompleteItem(null);
                  }}
                  className=\"flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all\"\u003eYes, Completed\u003c/button\u003e
               \u003c/div\u003e
            \u003c/div\u003e
         \u003c/div\u003e
      )}

      {/* Toast Notification */}
      {toast \u0026\u0026 (
        \u003cdiv className={cn(
          \"fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white font-label-bold text-label-bold uppercase tracking-widest shadow-2xl z-[100] animate-slideUp\",
          toast.type === 'success' ? \"bg-emerald-500\" : \"bg-red-500\"
        )}\u003e
          {toast.msg}
        \u003c/div\u003e
      )}
    \u003c/div\u003e
  );
}

// Auth Wrapper
export default function App() {
  const [user, setUser] = useState\u003cUser | null\u003e(null);
  const [loading, setLoading] = useState(true);

  useEffect(() =\u003e {
    return onAuthStateChanged(auth, (u) =\u003e {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      \u003cdiv className=\"min-h-screen bg-background flex items-center justify-center\"\u003e
        \u003cdiv className=\"w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin\"\u003e\u003c/div\u003e
      \u003c/div\u003e
    );
  }

  if (!user) {
    return (
      \u003cdiv className=\"min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-body-sm\"\u003e
        \u003cdiv className=\"absolute -left-40 -bottom-40 w-80 h-80 bg-blue-100/50 rounded-full blur-[100px] animate-pulse\"\u003e\u003c/div\u003e
        \u003cdiv className=\"absolute -right-40 -top-40 w-80 h-80 bg-blue-100/30 rounded-full blur-[100px] animate-pulse\"\u003e\u003c/div\u003e
        
        \u003cdiv className=\"w-full max-w-lg bg-white rounded-[3rem] p-10 md:p-12 shadow-[0_10px_50px_rgba(1,81,177,0.05)] border border-slate-200 relative z-10 animate-slideUp\"\u003e
           \u003cdiv className=\"flex flex-col items-center text-center\"\u003e
              \u003cdiv className=\"w-20 h-20 bg-[#0151B1] rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-200 animate-float\"\u003e
                \u003cTrendingUp className=\"w-10 h-10 text-white\" /\u003e
              \u003c/div\u003e
              \u003ch1 className=\"font-display font-black text-4xl text-slate-900 leading-tight mb-4\"\u003eTDP Roadmap\u003c/h1\u003e
              \u003cp className=\"text-slate-500 font-medium leading-relaxed mb-10\"\u003e
                The talent development journey starts here. Plan, track, and visualize your growth across three tiers of excellence.
              \u003c/p\u003e
              
              \u003cbutton 
                onClick={() =\u003e signInWithPopup(auth, googleProvider)}
                className=\"w-full py-4 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center gap-4 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 group mb-4\"\u003e
                \u003cimg src=\"https://www.google.com/favicon.ico\" className=\"w-5 h-5\" alt=\"\" /\u003e
                \u003cspan className=\"font-label-bold text-label-bold text-slate-600 group-hover:text-[#0151B1] transition-colors uppercase tracking-widest\"\u003eSign in with Google\u003c/span\u003e
              \u003c/button\u003e

              \u003cbutton 
                onClick={() =\u003e {
                  const mockUser = {
                    uid: 'mock_' + Date.now(),
                    displayName: 'Mock Student',
                    email: 'student@sajc.edu.sg',
                    photoURL: null,
                    emailVerified: true
                  } as User;
                  setUser(mockUser);
                }}
                className=\"w-full py-4 bg-blue-50/50 border-2 border-transparent rounded-2xl flex items-center justify-center gap-4 hover:bg-blue-100 transition-all duration-300 group\"\u003e
                \u003cShield className=\"w-5 h-5 text-blue-600\" /\u003e
                \u003cspan className=\"font-label-bold text-label-bold text-blue-600 uppercase tracking-widest\"\u003eMock Login (Dev Only)\u003c/span\u003e
              \u003c/button\u003e

              \u003cp className=\"mt-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]\"\u003eAuthorized Access Only \u0026bull; SAJC 2026\u003c/p\u003e
           \u003c/div\u003e
        \u003c/div\u003e
      \u003c/div\u003e
    );
  }

  return \u003cMainApp user={user} /\u003e;
}
