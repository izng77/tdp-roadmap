import { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Opportunity, Profile } from '../types';
import { SEED_COURSES } from '../seedData';

export function useRoadmapData(user: User | null) {
  const [profile, setProfile] = useState<Profile>({
    studentName: user?.displayName || 'Student',
    planned: [],
    pending: [],
    completed: [],
    rejected: [],
    bookmarks: []
  });

  const [catalog, setCatalog] = useState<Opportunity[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' } | null>(null);

  const isAdminUser = useMemo(() => {
    if (!user?.email) return false;
    const email = user.email.toLowerCase();
    return email.endsWith('@sajc.edu.sg') && (
      email.startsWith('staff') ||
      email.startsWith('teacher') ||
      email.startsWith('admin') ||
      email === 'student@sajc.edu.sg' ||
      email === 'hopesave@gmail.com' ||
      email === 'isaacng77@gmail.com' ||
      email === 'isaac@sajc.edu.sg'
    );
  }, [user?.email]);

  const isSuperAdminUser = useMemo(() => {
    if (!user?.email) return false;
    const email = user.email.toLowerCase();
    const superAdmins = ['hopesave@gmail.com', 'isaacng77@gmail.com', 'isaac@sajc.edu.sg'];
    return superAdmins.includes(email);
  }, [user?.email]);

  const showNotification = (msg: string, type: 'success' | 'err' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Logic Helpers ---

  const isTierLocked = (item: Opportunity) => {
    if (item.tier === 1) return false;
    const sameDomainCompleted = profile.completed.filter(c => c.domain === item.domain);
    const sameDomainPlanned = profile.planned.filter(p => p.domain === item.domain);
    return sameDomainCompleted.length === 0 && sameDomainPlanned.length === 0;
  };

  const getLockReason = (item: Opportunity) => {
    if (item.tier === 1) return "";
    return `Requires at least one Tier 1 or Tier 2 activity in ${item.domain}.`;
  };

  const getUnlockSuggestions = (item: Opportunity) => {
    return catalog.filter(o => o.domain === item.domain && o.tier < item.tier).slice(0, 2);
  };

  // --- Handlers ---

  const handleToggleBookmark = async (item: Opportunity) => {
    if (!user) return;
    const isBookmarked = profile.bookmarks.some(b => b.id === item.id);
    const bookmarkRef = doc(db, 'users', user.uid, 'bookmarks', item.id);
    try {
      if (isBookmarked) {
        await deleteDoc(bookmarkRef);
      } else {
        await setDoc(bookmarkRef, { addedAt: serverTimestamp() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/bookmarks`);
    }
  };

  const handleAdd = async (item: Opportunity, justification?: string) => {
    if (!user) return;
    const status = (item.tier === 3 || item.isExternal) ? 'pending' : 'planned';
    try {
      const newCourseRef = doc(collection(db, 'users', user.uid, 'courses'));
      await setDoc(newCourseRef, {
        opportunityId: item.id,
        status,
        order: profile.planned.length,
        addedAt: serverTimestamp(),
        name: item.name,
        tier: item.tier,
        domain: item.domain,
        justification: justification || ""
      });
      showNotification(status === 'pending' ? 'Enrollment request sent for approval!' : `Added "${item.name}" to your roadmap.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/courses`);
    }
  };

  const handleRemoveItem = async (docId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'courses', docId));
      showNotification("Item removed from your roadmap.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/courses/${docId}`);
    }
  };

  const handleCompleteCourse = async (item: any) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'courses', item.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      }, { merge: true });
      showNotification(`Mastery achieved: ${item.name}!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/courses/${item.id}`);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!user || !over || active.id === over.id) return;

    const oldIndex = profile.planned.findIndex(item => item.id === active.id);
    const newIndex = profile.planned.findIndex(item => item.id === over.id);

    const newPlanned = [...profile.planned];
    const [movedItem] = newPlanned.splice(oldIndex, 1);
    newPlanned.splice(newIndex, 0, movedItem);

    setProfile(prev => ({ ...prev, planned: newPlanned }));

    const batch = writeBatch(db);
    newPlanned.forEach((item, idx) => {
      const ref = doc(db, 'users', user.uid, 'courses', item.id);
      batch.update(ref, { order: idx });
    });
    await batch.commit();
  };

  const handleSeedData = async () => {
    const batch = writeBatch(db);
    SEED_COURSES.forEach(course => {
      const ref = doc(collection(db, 'opportunities'));
      batch.set(ref, course);
    });
    await batch.commit();
    showNotification("Catalog seeded successfully!", "success");
  };

  const handleFileUpload = async (data: any[]) => {
    const batch = writeBatch(db);
    data.forEach(item => {
      const ref = doc(collection(db, 'opportunities'));
      batch.set(ref, {
        name: item.Name || item.name,
        tier: Number(item.Tier || item.tier) || 1,
        domain: item.Domain || item.domain || "Uncategorized",
        description: item.Description || item.description || "",
        level: item.Level || item.level || "JC1",
        capacity: Number(item.Capacity || item.capacity) || 20,
        enrolled: 0
      });
    });
    await batch.commit();
    showNotification(`Imported ${data.length} opportunities!`, "success");
  };

  // --- Sync Effects ---

  useEffect(() => {
    if (!user) return;

    // 1. Sync Catalog
    const catalogUnsubscribe = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      const items: Opportunity[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as Opportunity));
      setCatalog(items);
      setDbLoading(false);
    });

    // 2. Sync Profile
    const coursesUnsubscribe = onSnapshot(query(collection(db, 'users', user.uid, 'courses'), orderBy('order', 'asc')), (snapshot) => {
      const planned: any[] = [];
      const pending: any[] = [];
      const completed: any[] = [];
      const rejected: any[] = [];

      snapshot.forEach(d => {
        const data = d.data();
        const item = { id: d.id, ...data };
        if (data.status === 'planned') planned.push(item);
        else if (data.status === 'pending') pending.push(item);
        else if (data.status === 'completed') completed.push(item);
        else if (data.status === 'rejected') rejected.push(item);
      });

      setProfile(prev => ({ ...prev, planned, pending, completed, rejected }));
    });

    const bookmarksUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'bookmarks'), (snapshot) => {
      const ids = snapshot.docs.map(d => d.id);
      setProfile(prev => ({
        ...prev,
        bookmarks: catalog.filter(o => ids.includes(o.id))
      }));
    });

    // 3. Admin Sync
    let adminUnsubscribe = () => { };
    if (isAdminUser) {
      adminUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: any[] = [];
        snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
        setAllUsers(users);
      });
    }

    return () => {
      catalogUnsubscribe();
      coursesUnsubscribe();
      bookmarksUnsubscribe();
      adminUnsubscribe();
    };
  }, [user, catalog.length, isAdminUser]);

  // --- Analytics & Formatting ---

  const domainDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    profile.completed.forEach(c => {
      dist[c.domain] = (dist[c.domain] || 0) + 1;
    });
    profile.planned.forEach(p => {
      dist[p.domain] = (dist[p.domain] || 0) + 0.5;
    });
    return dist;
  }, [profile.completed, profile.planned]);

  const chartData = useMemo(() => {
    const domains = Array.from(new Set(catalog.map(o => o.domain))).filter(Boolean);
    return domains.map(d => ({
      subject: d,
      A: domainDistribution[d] || 0,
      fullMark: 5
    }));
  }, [catalog, domainDistribution]);

  const topDomain = useMemo(() => {
    const sorted = Object.entries(domainDistribution).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : "Exploration";
  }, [domainDistribution]);

  return {
    profile, setProfile, dbLoading, catalog, setCatalog,
    isAdminUser, isSuperAdminUser, showAdminPanel, setShowAdminPanel,
    users: allUsers, activeTab, setActiveTab, toast,
    showNotification, handleToggleBookmark, handleSeedData, handleFileUpload,
    handleCompleteCourse, handleAdd, handleDragEnd, handleRemoveItem,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, chartData, topDomain,
    filterOptions: { domains: Array.from(new Set(catalog.map(o => o.domain))).sort() }
  };
}
