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

  useEffect(() => {
    if (!user) return;

    const isMock = user.uid.startsWith('mock_');
    setIsAdminUser(user.email?.endsWith('@sajc.edu.sg') && (user.email?.startsWith('staff') || user.email?.startsWith('teacher') || user.email?.startsWith('admin') || user.email === 'hopesave@gmail.com' || user.email === 'student@sajc.edu.sg'));

    if (isMock) {
      setCatalog(SEED_COURSES);
      setAllUsers([{
        id: user.uid,
        studentName: user.displayName,
        email: user.email,
        totalTierPoints: 0,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        pending: [],
        processed: []
      }]);
      return;
    }

    // 1. Sync Catalog
    const catalogUnsubscribe = onSnapshot(collection(db, 'opportunities'), (snapshot) => {
      const items: Opportunity[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as Opportunity);
      });
      setCatalog(items.length > 0 ? items : SEED_COURSES);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'opportunities'));

    // 2. Sync User Profile (Courses & Bookmarks)
    const coursesQuery = query(collection(db, 'users', user.uid, 'courses'));
    const profileUnsubscribe = onSnapshot(coursesQuery, (snapshot) => {
      const planned: Opportunity[] = [];
      const pending: Opportunity[] = [];
      const completed: Opportunity[] = [];
      const rejected: Opportunity[] = [];

      snapshot.forEach(d => {
        const data = d.data();
        const opp = catalog.find(o => o.id === data.opportunityId) || { 
          id: d.id, 
          name: data.name, 
          tier: data.tier, 
          domain: data.domain,
          courseId: data.opportunityId 
        } as Opportunity;
        
        const itemWithDocId = { ...opp, id: d.id, courseId: data.opportunityId };

        if (data.status === 'planned') planned.push(itemWithDocId);
        else if (data.status === 'pending') pending.push(itemWithDocId);
        else if (data.status === 'completed') completed.push(itemWithDocId);
        else if (data.status === 'rejected') rejected.push(itemWithDocId);
      });

      setProfile(prev => ({
        ...prev,
        planned: planned.sort((a, b) => (a as any).order - (b as any).order),
        pending,
        completed,
        rejected
      }));
    });

    const bookmarksUnsubscribe = onSnapshot(collection(db, 'users', user.uid, 'bookmarks'), (snapshot) => {
      const bookmarks: Opportunity[] = [];
      snapshot.forEach(d => {
        const opp = catalog.find(o => o.id === d.id);
        if (opp) bookmarks.push(opp);
      });
      setProfile(prev => ({ ...prev, bookmarks }));
    });

    // 3. Sync Admin Data (if applicable)
    let adminUnsubscribe = () => {};
    if (isAdminUser) {
      adminUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const users: any[] = [];
        snapshot.forEach(uDoc => {
          const uData = uDoc.data();
          users.push({ id: uDoc.id, ...uData });
        });
        setAllUsers(users);
      });
    }

    // Initialize user doc if not exists
    const initUser = async () => {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        studentName: user.displayName,
        email: user.email,
        lastLogin: serverTimestamp()
      }, { merge: true });
    };
    initUser();

    return () => {
      catalogUnsubscribe();
      profileUnsubscribe();
      bookmarksUnsubscribe();
      adminUnsubscribe();
    };
  }, [user, catalog.length, isAdminUser]);

  return {
    profile,
    setProfile,
    catalog,
    setCatalog,
    isAdminUser,
    allUsers
  };
}
