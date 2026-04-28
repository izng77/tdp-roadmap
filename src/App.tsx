import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { useRoadmapData } from './hooks/useRoadmapData';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { StudentDashboard } from './features/student/StudentDashboard';



function MainApp({ user }: { user: User }) {
  // Core data from hook
  const {
    profile, setProfile, dbLoading, catalog, setCatalog,
    isAdminUser, isSuperAdminUser, showAdminPanel, setShowAdminPanel,
    users, activeTab, setActiveTab, toast,
    showNotification, handleToggleBookmark, handleSeedData, handleFileUpload,
    handleCompleteCourse, handleAdd, handleDragEnd, handleRemoveItem, handleSyncCapacities,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, filterOptions, chartData, topDomain, isProfileReady
  } = useRoadmapData(user);

  // Local UI state
  const [focusMode, setFocusMode] = useState(false);



  if (dbLoading) {
    return (
      <div className="min-h-screen bg-surface-bright flex flex-col items-center justify-center font-body-sm text-on-background">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-4 border-secondary/10 border-t-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
        </div>
        <div className="font-display font-black text-xs text-primary uppercase tracking-[0.3em] animate-pulse">Initializing System</div>
      </div>
    );
  }

  if (showAdminPanel && isAdminUser) {
    return (
      <AdminDashboard
        user={user}
        profile={profile}
        setProfile={setProfile}
        catalog={catalog}
        setCatalog={setCatalog}
        users={users}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminUser={isAdminUser}
        isSuperAdminUser={isSuperAdminUser}
        showAdminPanel={showAdminPanel}
        setShowAdminPanel={setShowAdminPanel}
        toast={toast}
        showNotification={showNotification}
        handleSeedData={handleSeedData}
        handleFileUpload={handleFileUpload}
        handleSyncCapacities={handleSyncCapacities}
        domainDistribution={domainDistribution}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
      />
    );
  }

  return (
    <StudentDashboard
      user={user}
      profile={profile}
      setProfile={setProfile}
      catalog={catalog}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      isAdminUser={isAdminUser}
      showAdminPanel={showAdminPanel}
      setShowAdminPanel={setShowAdminPanel}
      toast={toast}
      showNotification={showNotification}
      handleToggleBookmark={handleToggleBookmark}
      handleAdd={handleAdd}
      handleDragEnd={handleDragEnd}
      handleRemoveItem={handleRemoveItem}
      handleCompleteCourse={handleCompleteCourse}
      isTierLocked={isTierLocked}
      getLockReason={getLockReason}
      getUnlockSuggestions={getUnlockSuggestions}
      chartData={chartData}
      topDomain={topDomain}
      filterOptions={filterOptions}
      focusMode={focusMode}
      setFocusMode={setFocusMode}
      isProfileReady={isProfileReady}
    />
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-success/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none"></div>

        <div className="w-full max-w-md glass-panel p-12 rounded-[2.5rem] text-center border border-white/10 shadow-2xl relative z-10 backdrop-blur-3xl">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-2xl group transition-transform duration-500 hover:rotate-12">
            <Lock className="w-8 h-8 text-white opacity-80" />
          </div>

          <h1 className="font-display font-black text-4xl text-white mb-4 tracking-tighter">SAJC TD</h1>
          <p className="text-blue-100/60 mb-12 font-medium tracking-wide uppercase text-[10px] tracking-[0.4em]">Talent Development Roadmap</p>

          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full bg-white text-primary font-black text-[10px] py-5 rounded-2xl shadow-2xl transition-all hover:bg-blue-50 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Authorize with Google
          </button>

          <div className="mt-10 pt-10 border-t border-white/5">
            <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">Restricted to SAJC Academic Network</p>
          </div>
        </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}
