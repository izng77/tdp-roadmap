import React from 'react';
import { doc, updateDoc, collectionGroup, onSnapshot, query, increment, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Opportunity } from '../types';

export function PendingUserRequests({ catalog, showNotification }: { catalog: Opportunity[], showNotification: any }) {
  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);

  React.useEffect(() => {
    const q = query(
      collectionGroup(db, 'courses'),
      where('status', 'in', ['pending', 'drop_pending']),
      orderBy('addedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(requests);
    }, (error) => {
      console.error("Collection group listener failed:", error);
      showNotification("Failed to load pending requests.", "err");
    });

    return () => unsubscribe();
  }, []);

  const handleAccept = async (course: any) => {
    try {
      await updateDoc(doc(db, 'users', course.studentId, 'courses', course.id), { status: 'planned' });
      const oppRef = doc(db, 'opportunities', course.opportunityId);
      await updateDoc(oppRef, { enrolled: increment(1) });
      showNotification(`Approved request for ${course.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${course.studentId}/courses/${course.id}`); }
  };

  const handleReject = async (course: any) => {
    try {
      await updateDoc(doc(db, 'users', course.studentId, 'courses', course.id), { status: 'rejected' });
      showNotification(`Rejected request for ${course.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${course.studentId}/courses/${course.id}`); }
  };

  const handleApproveDrop = async (course: any) => {
    try {
      // Mark as rejected to keep history, and decrement capacity.
      const courseRef = doc(db, 'users', course.studentId, 'courses', course.id);
      await updateDoc(courseRef, { status: 'rejected' });

      const oppRef = doc(db, 'opportunities', course.opportunityId);
      await updateDoc(oppRef, { enrolled: increment(-1) });

      showNotification(`Drop approved for ${course.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${course.studentId}/courses/${course.id}`); }
  };

  if (pendingRequests.length === 0) {
    return (
      <tr>
        <td colSpan={3} className="py-8 text-center text-slate-400 font-medium">
          No pending requests.
        </td>
      </tr>
    );
  }

  return (
    <>
      {pendingRequests.map(p => (
        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
              {(p.studentName || 'S').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span>{p.studentName || 'Unknown Student'}</span>
            </div>
          </td>
          <td className="py-4 px-4 text-slate-600 font-medium">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {catalog.find(c => c.id === p.opportunityId)?.name || p.name || 'Unknown Course'}
                {p.status === 'drop_pending' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider border border-red-200">Drop Requested</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200">Pending</span>
                )}
              </span>
              {p.justification && (
                <span className="text-xs text-slate-400 italic line-clamp-1" title={p.justification}>"{p.justification}"</span>
              )}
            </div>
          </td>
          <td className="py-4 px-4 text-right">
            <div className="flex gap-2 justify-end">
              {p.status === 'drop_pending' ? (
                <button onClick={() => handleApproveDrop(p)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Approve Drop</button>
              ) : (
                <button onClick={() => handleAccept(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Approve</button>
              )}
              <button onClick={() => handleReject(p)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all">Reject</button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
