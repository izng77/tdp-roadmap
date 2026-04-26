import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Opportunity, Profile } from '../types';
import { SEED_COURSES } from '../seedData';

export function useRoadmapData(user: User) {
  const [profile, setProfile] = useState<Profile>({
    studentName: user.displayName || 'Student',
    planned: [],
    pending: [],
    completed: [],
    rejected: [],
    bookmarks: []
  });

  const [catalog, setCatalog] = useState<Opportunity[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [dbLoading, setDbLoading] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' } | null>(null);

  const isSuperAdminUser = isAdminUser && (user.email === 'isaacng77@gmail.com' || user.email === 'hopesave@gmail.com' || user.email === 'student@sajc.edu.sg');

  const showNotification = (msg: string, type: 'success' | 'err' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user) return;

    const isMock = user.uid.startsWith('mock_');
    setIsAdminUser(user.email?.endsWith('@sajc.edu.sg') && (user.email?.startsWith('staff') || user.email?.startsWith('teacher') || user.email?.startsWith('admin') || user.email === 'hopesave@gmail.com' || user.email === 'student@sajc.edu.sg'));

    if (isMock) {
      setCatalog(SEED_COURSES);
      setDbLoading(false);
      return;
    }

    // 1. Sync Catalog
    const catalogUnsubscribe = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      const items: Opportunity[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as Opportunity);
      });
      setCatalog(items.length > 0 ? items : SEED_COURSES);
      setDbLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'opportunities');
      setDbLoading(false);
    });

    // 2. Sync User Profile (Courses \u0026 Bookmarks)
    const coursesQuery = query(collection(db, 'users', user.uid, 'courses'));
    const profileUnsubscribe = onSnapshot(coursesQuery, (snapshot) => {
      const planned: Opportunity[] = [];
      const pending: Opportunity[] = [];
      const completed: Opportunity[] = [];
      const rejected: Opportunity[] = [];

      snapshot.forEach(d => {
        const data = d.data();
        const opp = catalog.find(o =\u003e o.id === data.opportunityId) || { 
          id: d.id, 
          name: data.name, 
          tier: data.tier, 
          domain: data.domain,
          courseId: data.opportunityId 
        } as Opportunity;
        
        const itemWithDocId = { ...opp, id: d.id, courseId: data.opportunityId, status: data.status, justification: data.justification };

        if (data.status === 'planned') planned.push(itemWithDocId);
        else if (data.status === 'pending') pending.push(itemWithDocId);
        else if (data.status === 'completed') completed.push(itemWithDocId);
        else if (data.status === 'rejected') rejected.push(itemWithDocId);
      });

      setProfile(prev =\u003e ({
        ...prev,
        planned: planned.sort((a, b) => (a as any).order - (b as any).order),
        pending,
        completed,
        rejected
      }));
    });

    const bookmarksUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'bookmarks'), (snapshot) => {
      const bookmarks: Opportunity[] = [];
      snapshot.forEach(d =\u003e {
        const opp = catalog.find(o =\u003e o.id === d.id);
        if (opp) bookmarks.push(opp);
      });
      setProfile(prev =\u003e ({ ...prev, bookmarks }));
    });

    // 3. Sync Admin Data
    let adminUnsubscribe = () =\u003e {};
    if (isAdminUser) {
      adminUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: any[] = [];
        snapshot.forEach(uDoc =\u003e {
          users.push({ id: uDoc.id, ...uDoc.data() });
        });
        setAllUsers(users);
      });
    }

    const initUser = async () =\u003e {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          studentName: user.displayName,
          email: user.email,
          lastLogin: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error(\"Init User Error:\", e);
      }
    };
    initUser();

    return () =\u003e {
      catalogUnsubscribe();
      profileUnsubscribe();
      bookmarksUnsubscribe();
      adminUnsubscribe();
    };
  }, [user, catalog.length, isAdminUser]);

  // --- Logic Helpers ---

  const handleAdd = async (item: Opportunity, justification: string) =\u003e {
    try {
      const isMock = user.uid.startsWith('mock_');
      if (isMock) {
        setProfile(p =\u003e ({
          ...p,
          pending: [...p.pending, { ...item, status: 'pending', justification }]
        }));
        showNotification(`Request for \\\"${item.name}\\\" submitted (Mock Mode)`, 'success');
        return true;
      }

      await setDoc(doc(collection(db, 'users', user.uid, 'courses')), {
        opportunityId: item.id,
        status: 'pending',
        addedAt: serverTimestamp(),
        name: item.name,
        tier: item.tier,
        domain: item.domain,
        justification
      });
      showNotification('Enrollment request submitted for review.', 'success');
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/courses`);
      return false;
    }
  };

  const handleRemoveItem = async (docId: string) =\u003e {
    try {
      if (user.uid.startsWith('mock_')) {
        setProfile(p =\u003e ({
          ...p,
          planned: p.planned.filter(i =\u003e i.id !== docId),
          pending: p.pending.filter(i =\u003e i.id !== docId),
          rejected: p.rejected.filter(i =\u003e i.id !== docId)
        }));
        return;
      }
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', user.uid, 'courses', docId));
      showNotification('Item removed from your record.', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/courses/${docId}`);
    }
  };

  const handleToggleBookmark = async (item: Opportunity) =\u003e {
    try {
      const isBookmarked = profile.bookmarks.some(b =\u003e b.id === item.id);
      if (user.uid.startsWith('mock_')) {
        setProfile(p =\u003e ({
          ...p,
          bookmarks: isBookmarked ? p.bookmarks.filter(b =\u003e b.id !== item.id) : [...p.bookmarks, item]
        }));
        return;
      }
      const { deleteDoc } = await import('firebase/firestore');
      if (isBookmarked) {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', item.id));
      } else {
        await setDoc(doc(db, 'users', user.uid, 'bookmarks', item.id), { ...item, addedAt: serverTimestamp() });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/bookmarks`);
    }
  };

  const handleSeedData = async () =\u003e {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);
      SEED_COURSES.forEach(c =\u003e {
        batch.set(doc(db, 'opportunities', c.id), c);
      });
      await batch.commit();
      showNotification('Catalog seeded successfully.', 'success');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'opportunities');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent\u003cHTMLInputElement\u003e) =\u003e {
    const file = e.target.files?.[0];
    if (!file) return;
    showNotification(`Processing ${file.name}...`, 'success');
  };

  const isTierLocked = (item: Opportunity) =\u003e {
    if (item.tier \u003c 3) return false;
    const sameDomainCourses = [...profile.completed, ...profile.planned].filter(c =\u003e c.domain === item.domain);
    return !sameDomainCourses.some(c =\u003e c.tier === 1 || c.tier === 2);
  };

  const getLockReason = (item: Opportunity) =\u003e {
    if (!isTierLocked(item)) return null;
    return `Complete a Tier 1 or 2 course in ${item.domain} first.`;
  };

  const getUnlockSuggestions = (item: Opportunity) =\u003e {
    return catalog.filter(o =\u003e o.domain === item.domain \u0026\u0026 o.tier \u003c 3).slice(0, 2);
  };

  // --- Derived Analytics ---

  const domainDistribution = {
    topDomains: Object.entries(catalog.reduce((acc, curr) =\u003e {
      acc[curr.domain] = (acc[curr.domain] || 0) + 1;
      return acc;
    }, {} as Record\u003cstring, number\u003e)).sort((a, b) =\u003e b[1] - a[1]).slice(0, 5),
    max: 20
  };

  const filterOptions = {
    levels: Array.from(new Set(catalog.map(o =\u003e o.level).filter(Boolean))) as string[],
    terms: Array.from(new Set(catalog.map(o =\u003e o.term).filter(Boolean))) as string[],
    weeks: Array.from(new Set(catalog.map(o =\u003e o.week).filter(Boolean))) as string[]
  };

  const chartData = [
    'STEM \u0026 Innovation', 'Leadership \u0026 Service', 'Aesthetics \u0026 Culture', 'Physical \u0026 Sports', 'Global Awareness'
  ].map(subject =\u003e ({
    subject,
    Completed: profile.completed.filter(c =\u003e c.domain === subject).length * 5,
    Planned: profile.planned.filter(c =\u003e c.domain === subject).length * 3,
    fullMark: 15
  }));

  const topDomain = [...chartData].sort((a, b) =\u003e (b.Completed + b.Planned) - (a.Completed + a.Planned))[0];

  return {
    profile, setProfile, dbLoading, catalog, setCatalog,
    isAdminUser, isSuperAdminUser, showAdminPanel, setShowAdminPanel,
    users: allUsers, activeTab, setActiveTab, toast,
    showNotification, handleToggleBookmark, handleSeedData, handleFileUpload,
    handleCompleteCourse: () =\u003e {}, handleAdd, handleDragEnd: () =\u003e {}, handleRemoveItem,
    isTierLocked, getLockReason, getUnlockSuggestions,
    domainDistribution, filterOptions, chartData, topDomain,
  };
}
