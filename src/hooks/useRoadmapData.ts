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
  orderBy,
  limit,
  updateDoc,
  increment,
  collectionGroup,
  getDocs,
  getDoc
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
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isProfileReady, setIsProfileReady] = useState(false);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' } | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsAdminUser(false);
      setIsSuperAdminUser(false);
      return;
    }

    // Evaluate Firestore Custom Claims for true admin roles securely from the token
    user.getIdTokenResult().then((idTokenResult) => {
      const claims = idTokenResult.claims;

      setIsSuperAdminUser(!!claims.superAdmin);
      setIsAdminUser(!!claims.admin);
    }).catch(() => {
      // Errors handled silently to comply with production logging standards
    });
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const syncUserProfile = async () => {
      if (!user || user.uid.startsWith('mock_')) {
        if (isMounted) setIsProfileReady(!!user?.uid.startsWith('mock_'));
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          const fallbackName = user.email ? user.email.split('@')[0] : 'Student';
          const studentName = user.displayName && user.displayName.trim().length > 0
            ? user.displayName
            : fallbackName;

          await setDoc(userRef, {
            email: user.email || '',
            studentName: studentName.substring(0, 100) // enforce max length from firestore rules
          });
        }

        if (isMounted) setIsProfileReady(true);
      } catch (error) {
        console.error("Failed to sync user profile:", error);
      }
    };

    syncUserProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const showNotification = (msg: string, type: 'success' | 'err' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Logic Helpers ---

  const isTierLocked = (item: Opportunity) => {
    if (item.tier !== 3) return false;
    const targetDomain = (item.domain || "").trim().toLowerCase();
    const sameDomainCompleted = profile.completed.filter(c => (c.domain || "").trim().toLowerCase() === targetDomain && c.tier < 3);
    const sameDomainPlanned = profile.planned.filter(p => (p.domain || "").trim().toLowerCase() === targetDomain && p.tier < 3);
    return sameDomainCompleted.length === 0 && sameDomainPlanned.length === 0;
  };

  const getLockReason = (item: Opportunity) => {
    if (item.tier !== 3) return "";
    return `Requires at least one Tier 1 or Tier 2 activity in ${item.domain || "this domain"}.`;
  };

  const getUnlockSuggestions = (item: Opportunity) => {
    const targetDomain = (item.domain || "").trim().toLowerCase();
    return catalog.filter(o => (o.domain || "").trim().toLowerCase() === targetDomain && o.tier < item.tier).slice(0, 2);
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
    if (!user) return false;

    if (!isProfileReady && !user.uid.startsWith('mock_')) {
      showNotification("Your profile is still syncing. Please wait a moment.", "err");
      return false;
    }

    // Idempotency: Prevent adding duplicates
    const allUserCourses = [...profile.planned, ...profile.pending, ...profile.completed, ...profile.rejected];
    if (allUserCourses.some(c => c.opportunityId === item.id)) {
      showNotification("You have already added this opportunity.", "err");
      return false;
    }

    // Programmatic progression guardrail enforcement
    if (isTierLocked(item)) {
      showNotification(getLockReason(item), "err");
      return false;
    }

    const status = (item.tier === 3 || item.isExternal) ? 'pending' : 'planned';
    try {
      const dataToSet: any = {
        opportunityId: item.id,
        status,
        addedAt: serverTimestamp(),
        name: item.name,
        tier: item.tier,
        domain: item.domain,
        justification: justification || ""
      };

      if (status === 'planned') {
        // For new 'planned' items, add to the end of the list using fractional indexing.
        const lastItem = profile.planned.length > 0 ? profile.planned[profile.planned.length - 1] : null;
        const lastOrder = lastItem ? lastItem.order : 0;
        dataToSet.order = (lastOrder || 0) + 1000;
      } else {
        // Pending items don't need a specific order for drag-and-drop.
        // We assign 0 to satisfy the 'orderBy' query constraint.
        dataToSet.order = 0;
      }

      const newCourseRef = doc(collection(db, 'users', user.uid, 'courses'));
      await setDoc(newCourseRef, dataToSet);

      showNotification(status === 'pending' ? 'Enrollment request sent for approval!' : `Added "${item.name}" to your roadmap.`);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/courses`);
      return false;
    }
  };

  const handleRemoveItem = async (docId: string) => {
    if (!user) return false;

    try {
      const courseRef = doc(db, 'users', user.uid, 'courses', docId);
      const allCourses = [...profile.planned, ...profile.pending, ...profile.completed, ...profile.rejected];
      const item = allCourses.find(c => c.id === docId);

      if (item && (item.status === 'planned' || item.status === 'completed')) {
        // If it was already approved/planned, we need admin to approve the drop to sync capacity
        await updateDoc(courseRef, { status: 'drop_pending' });
        showNotification("Drop request sent to admin for capacity syncing.");
      } else {
        // If it's just a pending request or rejected, we can delete safely
        await deleteDoc(courseRef);
        showNotification("Item removed from your roadmap.");
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/courses/${docId}`);
      return false;
    }
  };

  const handleCompleteCourse = async (item: any) => {
    if (!user) return false;
    try {
      await setDoc(doc(db, 'users', user.uid, 'courses', item.id), {
        status: 'completed',
        completedAt: serverTimestamp()
      }, { merge: true });
      showNotification(`Mastery achieved: ${item.name}!`);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/courses/${item.id}`);
      return false;
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!user || !over || active.id === over.id) return;

    // Optimistic UI update
    const oldIndex = profile.planned.findIndex(item => item.id === active.id);
    const newIndex = profile.planned.findIndex(item => item.id === over.id);

    const originalPlanned = [...profile.planned];
    const newPlanned = [...profile.planned];
    const [movedItem] = newPlanned.splice(oldIndex, 1);
    newPlanned.splice(newIndex, 0, movedItem);

    setProfile(prev => ({ ...prev, planned: newPlanned }));

    // --- Remediation: Use Fractional Indexing for a single-write update ---

    // Get the order of the items before and after the new position
    const prevItem = newPlanned[newIndex - 1];
    const nextItem = newPlanned[newIndex + 1];

    const prevOrder = prevItem?.order || 0; // If it's the first item, use 0
    const nextOrder = nextItem?.order || (prevOrder + 1000); // If it's the last, add a buffer

    const newOrder = (prevOrder + nextOrder) / 2;

    // Only update the single moved document
    try {
      const ref = doc(db, 'users', user.uid, 'courses', active.id);
      await updateDoc(ref, { order: newOrder });
    } catch (err) {
      // Rollback on failure
      setProfile(prev => ({ ...prev, planned: originalPlanned }));
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/courses/${active.id}`);
      showNotification("Failed to reorder item. Reverted changes.", "err");
    }
  };

  const handleSeedData = async () => {
    if (user?.uid.startsWith('mock_')) {
      setCatalog(SEED_COURSES);
      localStorage.setItem('mock_catalog', JSON.stringify(SEED_COURSES));
      showNotification("Simulated: Catalog seeded locally.", "success");
      return;
    }

    const batch = writeBatch(db);
    SEED_COURSES.forEach(course => {
      // Use the fixed ID from seedData.ts as the Firestore document ID
      const { id, ...data } = course;
      const ref = doc(db, 'opportunities', id);
      batch.set(ref, data);
    });
    try {
      await batch.commit();
      showNotification("Catalog seeded successfully!", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'opportunities');
    }
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

  const handleSyncCapacities = async () => {
    if (!user || !isAdminUser) return false;

    try {
      const coursesQuery = query(collectionGroup(db, 'courses'));
      const snapshot = await getDocs(coursesQuery);

      const capacities: Record<string, number> = {};

      snapshot.forEach(d => {
        const data = d.data();
        if (data.status === 'planned' || data.status === 'completed') {
          capacities[data.opportunityId] = (capacities[data.opportunityId] || 0) + 1;
        }
      });

      const batch = writeBatch(db);
      let changesCount = 0;

      catalog.forEach(item => {
        const actualCount = capacities[item.id] || 0;
        if (item.enrolled !== actualCount) {
          const ref = doc(db, 'opportunities', item.id);
          batch.update(ref, { enrolled: actualCount });
          changesCount++;
        }
      });

      if (changesCount > 0) {
        await batch.commit();
        showNotification(`Capacities synced! Updated ${changesCount} courses.`, "success");
      } else {
        showNotification("All capacities are already up to date.", "success");
      }
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'opportunities');
      showNotification("Failed to sync capacities.", "err");
      return false;
    }
  };

  // --- Sync Effects ---

  useEffect(() => {
    if (catalogLoaded && profileLoaded) {
      setDbLoading(false);
    }
  }, [catalogLoaded, profileLoaded]);

  useEffect(() => {
    if (!user) {
      setDbLoading(true);
      setCatalogLoaded(false);
      setProfileLoaded(false);
      return;
    }

    if (user?.uid.startsWith('mock_')) {
      const saved = localStorage.getItem('mock_catalog');
      if (saved) {
        setCatalog(JSON.parse(saved));
      } else {
        setCatalog(SEED_COURSES); // Default if none
      }
      setCatalogLoaded(true);
      return;
    }

    // 1. Sync Catalog
    const catalogUnsubscribe = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      const items: Opportunity[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as Opportunity));
      setCatalog(items);
      setCatalogLoaded(true);
    });

    return () => catalogUnsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // 2. Sync Profile Courses
    const coursesUnsubscribe = onSnapshot(query(collection(db, 'users', user.uid, 'courses'), orderBy('order', 'asc')), (snapshot) => {
      const planned: any[] = [];
      const pending: any[] = [];
      const completed: any[] = [];
      const rejected: any[] = [];

      snapshot.forEach(d => {
        const data = d.data();
        const item = { id: d.id, ...data };
        if (data.status === 'planned') planned.push(item);
        else if (data.status === 'pending' || data.status === 'drop_pending') pending.push(item);
        else if (data.status === 'completed') completed.push(item);
        else if (data.status === 'rejected') rejected.push(item);
      });

      setProfile(prev => ({ ...prev, planned, pending, completed, rejected }));
      setProfileLoaded(true);
    });

    // 2b. Sync Bookmark IDs
    const bookmarksUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'bookmarks'), (snapshot) => {
      const ids = snapshot.docs.map(d => d.id);
      setBookmarkIds(ids);
    });

    return () => {
      coursesUnsubscribe();
      bookmarksUnsubscribe();
    };
  }, [user]);

  // 3. Link Bookmarks to Profile
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      bookmarks: catalog.filter(o => bookmarkIds.includes(o.id))
    }));
  }, [catalog, bookmarkIds]);

  // 4. Admin Sync (Lazy load based on showAdminPanel)
  useEffect(() => {
    if (!user || !isAdminUser || !showAdminPanel) return;

    // Capped at 100 to prevent massive read spikes.
    const adminQuery = query(collection(db, 'users'), orderBy('studentName'), limit(100));
    const adminUnsubscribe = onSnapshot(adminQuery, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(d => users.push({ id: d.id, ...d.data() }));
      setAllUsers(users);
    });

    return () => adminUnsubscribe();
  }, [user, isAdminUser, showAdminPanel]);

  // --- Analytics & Formatting ---

  const domainDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    const displayNames: Record<string, string> = {};

    profile.completed.forEach(c => {
      const domain = c.domain || "Uncategorized";
      const norm = domain.trim().toLowerCase();
      displayNames[norm] = domain;
      dist[norm] = (dist[norm] || 0) + 1;
    });
    profile.planned.forEach(p => {
      const domain = p.domain || "Uncategorized";
      const norm = domain.trim().toLowerCase();
      displayNames[norm] = domain;
      dist[norm] = (dist[norm] || 0) + 0.5;
    });

    // Map back to display names for UI
    const entries = Object.entries(dist).map(([norm, val]) => [displayNames[norm] || norm, val] as [string, number]);
    const topDomains = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = Math.max(...entries.map(e => e[1]), 1);

    return { dist, topDomains, max, displayNames };
  }, [profile.completed, profile.planned]);

  const chartData = useMemo(() => {
    const uniqueDomains = new Map<string, string>();
    catalog.forEach(o => {
      if (o.domain) {
        uniqueDomains.set(o.domain.trim().toLowerCase(), o.domain);
      }
    });

    return Array.from(uniqueDomains.entries()).map(([norm, display]) => ({
      subject: display,
      Completed: domainDistribution.dist[norm] || 0,
      fullMark: 5
    }));
  }, [catalog, domainDistribution]);

  const topDomain = useMemo(() => {
    return domainDistribution.topDomains.length > 0 ? domainDistribution.topDomains[0][0] : "Exploration";
  }, [domainDistribution]);

  return {
    profile, setProfile, dbLoading, catalog, setCatalog,
    isAdminUser, isSuperAdminUser, showAdminPanel, setShowAdminPanel,
    users: allUsers, activeTab, setActiveTab, toast,
    showNotification, handleToggleBookmark, handleSeedData, handleFileUpload,
    handleCompleteCourse, handleAdd, handleDragEnd, handleRemoveItem, handleSyncCapacities,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, chartData, topDomain,
    isProfileReady,
    filterOptions: { domains: Array.from(new Set(catalog.map(o => o.domain))).sort() }
  };
}
