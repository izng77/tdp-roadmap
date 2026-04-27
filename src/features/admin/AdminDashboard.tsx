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
                                        <button onClick={async () => { handleSeedData(); }} className="px-6 py-3 bg-[#0151B1] hover:bg-blue-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider">
                                            Seed Default Catalog Data
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
                                            className="px-6 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-label-bold text-label-bold rounded-full shadow-sm transition-all uppercase tracking-wider flex items-center gap-2"
                                        >
                                            <ImageIcon className="w-4 h-4" /> Auto-Generate Thumbnails
                                        </button>

                                        <label className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-[#0151B1]/30 rounded-full cursor-pointer hover:border-[#0151B1] hover:bg-blue-50 transition-colors group">
                                            <input type="file" className="hidden" accept=".json,.csv,.xlsx,.xls" onChange={handleFileUpload} />
                                            <Upload className="w-5 h-5 mr-2 text-[#0151B1] transition-colors" />
                                            <span className="font-label-bold text-label-bold text-[#0151B1] uppercase tracking-wider">Import from CSV / JSON / XLSX</span>
                                        </label>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        setEditingCourseId('new-' + Date.now().toString());
                                        setEditingCourseData({ name: '', domain: '', tier: 1, enrolled: 0, capacity: 20 });
                                    }}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-label-bold text-label-bold rounded-full shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" /> Add New Course
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

                {/* Admin Modals (Edit Course / Edit Image) */}
                {editingCourseId && editingCourseData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                            <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 focus:outline-none"><X className="w-5 h-5" /></button>
                            <h2 className="text-xl font-bold text-slate-900 mb-6">Edit Course Details</h2>

                            <div className="space-y-4">
                                <input type="text" value={editingCourseData.name || ''} onChange={(e) => setEditingCourseData({ ...editingCourseData, name: e.target.value })} className="w-full border border-slate-200 rounded-lg p-3 outline-none" placeholder="Course Name" />
                                <div className="flex justify-end gap-3 pt-4">
                                    <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="px-5 py-2.5 rounded-full text-slate-600 font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                                    <button onClick={async () => {
                                        try {
                                            const isMock = user.uid.startsWith('mock_');
                                            if (!isMock) {
                                                const b = writeBatch(db);
                                                const cleanData = { ...editingCourseData };
                                                if (cleanData.enrolled === undefined) cleanData.enrolled = 0;
                                                delete (cleanData as any).id;
                                                b.set(doc(db, 'opportunities', editingCourseId as string), cleanData, { merge: true });
                                                await b.commit();
                                            } else {
                                                const updatedCatalog = catalog.map(item => item.id === editingCourseId ? { ...editingCourseData, id: editingCourseId } as Opportunity : item);
                                                setCatalog(updatedCatalog);
                                            }
                                            showNotification('Course details updated successfully', 'success');
                                            setEditingCourseId(null);
                                        } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'opportunities'); }
                                    }} className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition-all">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
                        <div className={cn("px-4 py-3 rounded-xl shadow-lg flex items-center gap-3", toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
                            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            <span className="font-medium text-sm">{toast.msg}</span>
                        </div>
                    </div>
                )}
                <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} showAdminPanel={showAdminPanel} />
            </main>
        </div>
    );
}