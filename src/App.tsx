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
    handleCompleteCourse, handleAdd, handleDragEnd, handleRemoveItem,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, filterOptions, chartData, topDomain,
  } = useRoadmapData(user);

  // Local UI state
  const [focusMode, setFocusMode] = useState(false);



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
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}
