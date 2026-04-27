import React, { useState } from 'react';
import { LayoutDashboard, Users, BookOpen, TrendingUp, Bell, Database, Image as ImageIcon, Pencil, X, Plus, Flame, CheckCircle2, Upload } from 'lucide-react';
import { doc, deleteDoc, getDocs, collection, writeBatch, updateDoc } from 'firebase/firestore';
import { signOut, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Opportunity, Profile } from '../../types';
import { cn, categorizeDomain, getTierName } from '../../utils';
import { TopNavBar, SideNavBar, DesktopTopBar, BottomNavBar } from '../../components/Navigation';
import { PendingUserRequests } from '../../components/PendingUserRequests';

interface AdminDashboardProps {
    user: User;
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    catalog: Opportunity[];
    setCatalog: React.Dispatch<React.SetStateAction<Opportunity[]>>;
    users: any[];
    activeTab: number;
    setActiveTab: React.Dispatch<React.SetStateAction<number>>;
    isAdminUser: boolean;
    isSuperAdminUser: boolean;
    showAdminPanel: boolean;
    setShowAdminPanel: React.Dispatch<React.SetStateAction<boolean>>;
    toast: { msg: string; type: 'success' | 'err' } | null;
    showNotification: (msg: string, type?: 'success' | 'err') => void;
    handleSeedData: () => Promise<void>;
    handleFileUpload: (e: any) => Promise<void>;
    domainDistribution: any;
    focusMode: boolean;
    setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AdminDashboard({
    user, profile, setProfile, catalog, setCatalog, users,
    activeTab, setActiveTab, isAdminUser, isSuperAdminUser,
    showAdminPanel, setShowAdminPanel, toast, showNotification,
    handleSeedData, handleFileUpload, domainDistribution,
    focusMode, setFocusMode
}: AdminDashboardProps) {
    // Local Admin State (Moved from App.tsx)
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [editedImageUrl, setEditedImageUrl] = useState<string>("");
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const [editingCourseData, setEditingCourseData] = useState<Partial<Opportunity> | null>(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [catalogFilterLevel, setCatalogFilterLevel] = useState<'all' | 'mine'>('all');

    return (
        <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
            <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
            <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />

            <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
                <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />

                <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap">
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="font-display font-black text-4xl text-primary tracking-tighter">Teacher Console</h1>
                            <p className="text-base font-medium text-on-surface-variant mt-2 opacity-60">Strategic management of talent development pathways and student progress.</p>
                        </div>
                        <button onClick={() => setShowAdminPanel(false)} className="px-8 py-3.5 bg-surface-dim text-primary font-black text-[10px] rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] shadow-sm border border-outline-variant flex items-center gap-2.5 active:scale-95">
                            <LayoutDashboard className="w-4 h-4" /> Switch to Student View
                        </button>
                    </div>

                    {/* Overview Tab */}
                    <div className={cn("flex-col gap-6", activeTab === 0 ? "flex animate-fadeIn" : "hidden")}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="pro-card p-8 flex items-center gap-6 bg-white">
                                <div className="w-14 h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
                                    <Users className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Total Students</h3>
                                    <p className="font-display text-4xl font-black text-primary tabular-nums">{users.length}</p>
                                </div>
                            </div>
                            <div className="pro-card p-8 flex items-center gap-6 bg-white">
                                <div className="w-14 h-14 rounded-2xl bg-secondary/5 text-secondary flex items-center justify-center shrink-0 border border-secondary/10">
                                    <BookOpen className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Active Courses</h3>
                                    <p className="font-display text-4xl font-black text-primary tabular-nums">{catalog.length}</p>
                                </div>
                            </div>
                            <div className="pro-card p-8 flex items-center gap-6 bg-white">
                                <div className="w-14 h-14 rounded-2xl bg-success/5 text-success flex items-center justify-center shrink-0 border border-success/10">
                                    <TrendingUp className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Avg Engagement</h3>
                                    <p className="font-display text-4xl font-black text-primary tabular-nums">78%</p>
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

                    <div className={cn(activeTab === 1 ? "block animate-fadeIn" : "hidden")}>
                        <div className="pro-card p-10 bg-white">
                            <h2 className="font-display font-black text-2xl text-primary tracking-tight mb-4">Catalog Management</h2>
                            <p className="text-sm font-medium text-on-surface-variant opacity-60 mb-10 max-w-2xl">
                                Orchestrate the talent development catalog. Synchronize with Google Sheets or manage individual course properties.
                            </p>

                            <div className="flex flex-wrap gap-3">
                                {isSuperAdminUser && (
                                    <>
                                        <button onClick={async () => { handleSeedData(); }} className="px-6 py-3 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95">
                                            Seed Database
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    const isMock = user.uid.startsWith('mock_');
                                                    let b = !isMock ? writeBatch(db) : null;
                                                    let count = 0;
                                                    const newCatalog = catalog.map(item => ({ ...item, domain: categorizeDomain(item.name) }));
                                                    if (!isMock && b) {
                                                        for (const item of catalog) {
                                                            b.update(doc(db, 'opportunities', item.id), { domain: categorizeDomain(item.name) });
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
                                            className="px-6 py-3 bg-surface-dim text-primary border border-outline-variant text-[10px] font-black rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] active:scale-95"
                                        >
                                            Auto-Categorize
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
                                                        b.update(doc(db, 'opportunities', item.id), { enrolled: courseCounts[item.id] || 0 });
                                                        count++;
                                                        if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
                                                    }
                                                    if (count > 0) await b.commit();
                                                    showNotification('Enrollments recalculated successfully based on actual user data.', 'success');
                                                } catch (e) {
                                                    handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
                                                }
                                            }}
                                            className="px-6 py-3 bg-error/5 text-error border border-error/20 text-[10px] font-black rounded-xl hover:bg-error/10 transition-all uppercase tracking-[0.2em] active:scale-95"
                                        >
                                            Sync Enrollment
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
                                                            if (b) b.update(doc(db, 'opportunities', item.id), { image: newUrl });
                                                            newCatalog[i] = { ...item, image: newUrl };
                                                            count++;
                                                            if (b && count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
                                                        }
                                                    }
                                                    if (b && count > 0) await b.commit();
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
                                            className="px-6 py-3 bg-surface-dim text-primary border border-outline-variant text-[10px] font-black rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] flex items-center gap-2 active:scale-95"
                                        >
                                            <ImageIcon className="w-4 h-4" /> Thumbnails
                                        </button>

                                        <label className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group active:scale-95">
                                            <input type="file" className="hidden" accept=".json,.csv,.xlsx,.xls" onChange={handleFileUpload} />
                                            <Upload className="w-4 h-4 mr-2 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Bulk Import</span>
                                        </label>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setEditingCourseId('new-' + Date.now().toString());
                                        setEditingCourseData({ name: '', domain: '', tier: 1, enrolled: 0, capacity: 20, ownerEmails: user?.email ? [user.email] : [] });
                                    }}
                                    className="px-6 py-3 bg-success text-white text-[10px] font-black rounded-xl hover:bg-success/90 shadow-lg shadow-success/20 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 ml-auto"
                                >
                                    <Plus className="w-5 h-5" /> Add Course
                                </button>
                            </div>

                            <div className="mt-8 border-t border-slate-200 pt-8">
                                <div className="flex justify-between items-end mb-4">
                                    <h3 className="font-headline-md text-headline-md font-bold text-slate-900">Live Catalog Overview</h3>
                                    <div className="flex bg-slate-100 p-1 rounded-full">
                                        <button onClick={() => setCatalogFilterLevel('all')} className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'all' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}>All Courses</button>
                                        <button onClick={() => setCatalogFilterLevel('mine')} className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'mine' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}>Assigned to Me</button>
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
                                                                <img src={item.image} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
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

                                                        {(isSuperAdminUser || (user?.email && item.ownerEmails?.includes(user?.email))) && (
                                                            <>
                                                                <button onClick={() => { setEditingCourseId(item.id); setEditingCourseData({ ...item, description: item.description || 'Master core concepts.' }); }} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors ml-2" title="Edit Details"><Pencil className="w-4 h-4" /></button>
                                                                <button onClick={() => { setEditingImageId(item.id); setEditedImageUrl(item.image || ""); }} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors" title="Edit Thumbnail"><ImageIcon className="w-4 h-4" /></button>
                                                                {isSuperAdminUser && (
                                                                    <button onClick={async () => {
                                                                        try {
                                                                            const isMock = user.uid.startsWith('mock_');
                                                                            if (!isMock) await deleteDoc(doc(db, 'opportunities', item.id));
                                                                            else setCatalog(catalog.filter(o => o.id !== item.id));
                                                                            showNotification('Removed successfully', 'success');
                                                                        } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'opportunities'); }
                                                                    }} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors ml-1" title="Delete Item"><X className="w-4 h-4" /></button>
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

                    {/* Additional Tabs (Students, Requests, Analytics, Settings) */}
                    {/* NOTE: Extracted as-is from App.tsx */}
                    <div className={cn("flex flex-col animate-fadeIn", activeTab === 2 ? "flex" : "hidden")}>
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                            <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Student Directory</h2>
                            <p className="text-slate-500 mb-6">Manage student profiles and view overall progress records.</p>
                            <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">{(u.studentName || 'S').substring(0, 2).toUpperCase()}</div>
                                                    {u.studentName || 'Unknown Student'}
                                                </td>
                                                <td className="py-4 px-4 text-slate-500 hidden md:table-cell">{u.email}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Pending Requests Tab */}
                    <div className={cn("flex flex-col animate-fadeIn", activeTab === 3 ? "flex" : "hidden")}>
                        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                            <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Enrollment Requests</h2>
                            <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <tbody>
                                        {users.map(u => (
                                            <PendingUserRequests key={u.id} userDoc={u} catalog={catalog} showNotification={showNotification} mockPending={u.id === user.uid && user.uid.startsWith('mock_') ? profile.pending : undefined} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Analytics & Settings Tabs */}
                    <div className={cn("flex flex-col animate-fadeIn", activeTab === 4 ? "flex" : "hidden")}>
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200">
                            <h2 className="font-display font-bold text-slate-900 mb-4">School Analytics</h2>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex items-center justify-center">
                                <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
                                <div className="text-xl font-bold text-slate-700">Detailed Report Generation</div>
                            </div>
                        </div>
                    </div>

                    <div className={cn("flex flex-col animate-fadeIn", activeTab === 5 ? "flex" : "hidden")}>
                        <div className="bg-white rounded-[2rem] p-8 border border-slate-200">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <div className="font-bold text-slate-900">Sign Out</div>
                                    <div className="text-sm text-slate-500">Log out of your administrative session.</div>
                                </div>
                                <button onClick={() => signOut(auth)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 font-bold rounded-lg hover:bg-red-100">Sign Out</button>
                            </div>
                        </div>
                    </div>

                </div>

                {editingCourseId && editingCourseData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
                        <div className="bg-white rounded-2xl p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar border border-outline-variant transform transition-all duration-300 scale-100 opacity-100">
                            <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="absolute top-8 right-8 text-outline hover:text-primary transition-colors active:scale-90"><X className="w-6 h-6" /></button>
                            <h2 className="font-display font-black text-2xl text-primary tracking-tight mb-10">Course Configuration</h2>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Course Name</label>
                                    <input type="text" value={editingCourseData.name || ''} onChange={(e) => setEditingCourseData({ ...editingCourseData, name: e.target.value })} className="w-full bg-surface-dim border border-outline-variant rounded-xl p-4 outline-none focus:border-primary transition-colors font-bold text-primary" placeholder="e.g. Advanced Quantum Mechanics" />
                                </div>
                                <div className="flex justify-end gap-4 pt-6 border-t border-outline-variant/30">
                                    <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="px-8 py-3.5 rounded-xl text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-surface-dim transition-colors">Cancel</button>
                                    <button onClick={async () => {
                                        try {
                                            const isMock = user.uid.startsWith('mock_');
                                            if (!isMock) {
                                                const b = writeBatch(db);
                                                const cleanData = { ...editingCourseData };
                                                if (cleanData.enrolled === undefined) cleanData.enrolled = 0;
                                                delete (cleanData as any).id;

                                                let docRef = doc(db, 'opportunities', editingCourseId as string);
                                                if (editingCourseId?.startsWith('new-')) {
                                                    docRef = doc(collection(db, 'opportunities'));
                                                }

                                                b.set(docRef, cleanData, { merge: true });
                                                await b.commit();
                                            } else {
                                                const updatedCatalog = catalog.map(item => item.id === editingCourseId ? { ...editingCourseData, id: editingCourseId } as Opportunity : item);
                                                setCatalog(updatedCatalog);
                                            }
                                            showNotification('Course configuration saved.', 'success');
                                            setEditingCourseId(null);
                                        } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'opportunities'); }
                                    }} className="px-10 py-3.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95">Commit Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className="fixed bottom-10 right-10 z-[200] animate-fadeInUp">
                        <div className={cn("glass-panel px-6 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20", toast.type === 'success' ? 'bg-success/90 text-white' : 'bg-error/90 text-white')}>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </div>
                            <span className="font-black text-[11px] uppercase tracking-[0.1em]">{toast.msg}</span>
                        </div>
                    </div>
                )}
                <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} showAdminPanel={showAdminPanel} />
            </main>
        </div>
    );
}
