import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, setDoc, query, onSnapshot, writeBatch } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { Opportunity, Profile } from './types';
import { initialCatalog } from './data/mockCatalog';
import { categorizeDomain } from './utils';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { StudentDashboard } from './features/student/StudentDashboard';
import { Sparkles, Loader2, LogIn, Github } from 'lucide-react';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [catalog, setCatalog] = useState<Opportunity[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' } | null>(null);
    const [focusMode, setFocusMode] = useState(false);

    const showNotification = (msg: string, type: 'success' | 'err' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Auth & Data Sync logic (unchanged)
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                const isMock = u.uid.startsWith('mock_');
                if (isMock) {
                    const saved = localStorage.getItem(`mock_profile_${u.uid}`);
                    if (saved) setProfile(JSON.parse(saved));
                    else {
                        const init = { studentName: u.displayName || 'Demo Student', planned: [], completed: [], pending: [], bookmarks: [], rejected: [], lastUpdated: new Date().toISOString() };
                        setProfile(init);
                        localStorage.setItem(`mock_profile_${u.uid}`, JSON.stringify(init));
                    }
                    const savedCatalog = localStorage.getItem('mock_catalog');
                    setCatalog(savedCatalog ? JSON.parse(savedCatalog) : initialCatalog);
                } else {
                    const snap = await getDoc(doc(db, 'users', u.uid));
                    if (snap.exists()) setProfile(snap.data() as Profile);
                    else {
                        const init = { studentName: u.displayName || 'Student', planned: [], completed: [], pending: [], bookmarks: [], rejected: [], lastUpdated: new Date().toISOString() };
                        await setDoc(doc(db, 'users', u.uid), init);
                        setProfile(init);
                    }
                }
            } else { setUser(null); setProfile(null); }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!user) return;
        const isMock = user.uid.startsWith('mock_');
        if (isMock) return;
        const qCatalog = query(collection(db, 'opportunities'));
        const unsubCatalog = onSnapshot(qCatalog, (s) => setCatalog(s.docs.map(d => ({ id: d.id, ...d.data() } as Opportunity))));
        const qUsers = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(qUsers, (s) => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => { unsubCatalog(); unsubUsers(); };
    }, [user]);

    if (loading) return (
        <div className="fixed inset-0 bg-[#F8FAFC] flex flex-col items-center justify-center gap-8">
            <div className="relative">
                <div className="w-20 h-20 border-[3px] border-primary/10 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-20 h-20 border-t-[3px] border-primary rounded-full animate-spin [animation-duration:0.8s]"></div>
            </div>
            <div className="flex flex-col items-center gap-2">
                <h2 className="font-display font-black text-2xl text-primary tracking-tighter uppercase">TDP Roadmap</h2>
                <div className="flex items-center gap-2 text-primary/40 font-black text-[10px] uppercase tracking-[0.3em]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Initializing Core Engine
                </div>
            </div>
        </div>
    );

    if (!user) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-primary selection:text-white">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="font-display font-black text-4xl text-primary tracking-tighter mb-2">TDP ROADMAP</h1>
                    <p className="text-primary/40 font-black text-[10px] uppercase tracking-[0.4em]">Advanced Talent Intelligence</p>
                </div>
                
                <div className="pro-card p-10 bg-white shadow-2xl shadow-slate-200/50 space-y-8">
                    <div className="space-y-4">
                        <button onClick={() => auth.signInWithPopup(new GithubProvider())} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 group">
                            <Github className="w-4 h-4 group-hover:rotate-12 transition-transform" /> Sign in with Github
                        </button>
                        <button onClick={() => { localStorage.setItem('is_mock_user', 'true'); window.location.reload(); }} className="w-full py-4 bg-surface-dim text-primary border border-outline-variant rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-surface-bright transition-all active:scale-95">
                            <LogIn className="w-4 h-4" /> Student Portal Demo
                        </button>
                        <button onClick={() => { localStorage.setItem('is_mock_admin', 'true'); window.location.reload(); }} className="w-full py-4 bg-white text-primary border-2 border-primary/10 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/5 transition-all active:scale-95">
                            <ShieldCheck className="w-4 h-4" /> Teacher Console Demo
                        </button>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                            Built for the JC1 Pilot Phase <br/>
                            <span className="opacity-50">© 2026 Academic Talent Unit</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!profile) return null;

    const isAdminUser = user.uid.includes('admin') || user.email?.includes('staff') || user.email?.includes('admin') || (user.uid.startsWith('mock_') && localStorage.getItem('is_mock_admin') === 'true');
    const isSuperAdminUser = isAdminUser;

    return showAdminPanel && isAdminUser ? (
        <AdminDashboard 
            user={user} profile={profile} setProfile={setProfile} catalog={catalog} setCatalog={setCatalog} users={users}
            activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} isSuperAdminUser={isSuperAdminUser}
            showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} toast={toast} showNotification={showNotification}
            handleSeedData={async () => { /* Logic */ }} handleFileUpload={async () => { /* Logic */ }} domainDistribution={{}}
            focusMode={focusMode} setFocusMode={setFocusMode}
        />
    ) : (
        <StudentDashboard 
            user={user} profile={profile} setProfile={setProfile} catalog={catalog} activeTab={activeTab} setActiveTab={setActiveTab}
            isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} toast={toast}
            showNotification={showNotification} handleToggleBookmark={async () => { /* Logic */ }} handleAdd={async () => true}
            handleDragEnd={async () => { /* Logic */ }} handleRemoveItem={async () => true} handleCompleteCourse={async () => true}
            isTierLocked={() => false} getLockReason={() => ''} getUnlockSuggestions={() => []} chartData={[]} topDomain={{}}
            filterOptions={{}} focusMode={focusMode} setFocusMode={setFocusMode}
        />
    );
}

export default App;