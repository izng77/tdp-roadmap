import React from 'react';
import { doc, getDoc, updateDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Opportunity } from '../types';

export function PendingUserRequests({ userDoc, catalog, showNotification, mockPending, mockProcessed, onMockAction }: { userDoc: any, catalog: Opportunity[], showNotification: any, mockPending?: any[], mockProcessed?: any[], onMockAction?: (courseId: string, action: 'approve' | 'reject' | 'undo') => void }) {
  const [pending, setPending] = React.useState<any[]>([]);
  const [processed, setProcessed] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    if (userDoc.id.startsWith('mock_')) {
      if (mockPending) setPending(mockPending);
      if (mockProcessed) setProcessed(mockProcessed);
      return;
    }
    const q = query(collection(db, 'users', userDoc.id, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p: any[] = [];
      const proc: any[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        if (data.status === 'pending') { p.push({ id: d.id, ...data }); }
        else if (data.status === 'planned' || data.status === 'rejected') { proc.push({ id: d.id, ...data }); }
      });
      setPending(p);
      setProcessed(proc);
    }, () => { console.warn("Requests sync failed for user", userDoc.id); });
    return () => unsubscribe();
  }, [userDoc.id, mockPending, mockProcessed]);

  const handleAccept = async (courseId: string, opportunityId: string) => {
    try {
      const isMock = userDoc.id.startsWith('mock_');
      if (!isMock) {
        await updateDoc(doc(db, 'users', userDoc.id, 'courses', courseId), { status: 'planned' });
        const oppRef = doc(db, 'opportunities', opportunityId);
        const oppData = await getDoc(oppRef);
        if (oppData.exists()) {
          const currentEnrolled = oppData.data().enrolled || 0;
          await updateDoc(oppRef, { enrolled: currentEnrolled + 1 });
        }
      } else if (onMockAction) { onMockAction(courseId, 'approve'); }
      showNotification(`Approved request for ${userDoc.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userDoc.id}/courses/${courseId}`); }
  };

  const handleReject = async (courseId: string) => {
    try {
      const isMock = userDoc.id.startsWith('mock_');
      if (!isMock) { await updateDoc(doc(db, 'users', userDoc.id, 'courses', courseId), { status: 'rejected' }); }
      else if (onMockAction) { onMockAction(courseId, 'reject'); }
      showNotification(`Rejected request for ${userDoc.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userDoc.id}/courses/${courseId}`); }
  };

  const handleUndo = async (courseId: string, opportunityId: string, currentStatus: string) => {
    try {
      const isMock = userDoc.id.startsWith('mock_');
      if (!isMock) {
        await updateDoc(doc(db, 'users', userDoc.id, 'courses', courseId), { status: 'pending' });
        if (currentStatus === 'planned') {
          const oppRef = doc(db, 'opportunities', opportunityId);
          const oppData = await getDoc(oppRef);
          if (oppData.exists()) { const currentEnrolled = oppData.data().enrolled || 0; await updateDoc(oppRef, { enrolled: Math.max(0, currentEnrolled - 1) }); }
        }
      } else if (onMockAction) { onMockAction(courseId, 'undo'); }
      showNotification(`Action undone for ${userDoc.studentName}`, 'success');
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `users/${userDoc.id}/courses/${courseId}`); }
  };

  if (pending.length === 0 && processed.length === 0) return null;

  return (
    <>
      {pending.map(p => (
        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
              {(userDoc.studentName || 'S').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span>{userDoc.studentName || 'Unknown Student'}</span>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                  {(userDoc.totalTierPoints || 0)} Pts
                </span>
                {userDoc.domainExp?.[catalog.find(c => c.id === p.opportunityId)?.domain || ''] && (
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">
                    {userDoc.domainExp[catalog.find(c => c.id === p.opportunityId)?.domain || '']} Done in Domain
                  </span>
                )}
              </div>
            </div>
          </td>
          <td className="py-4 px-4 text-slate-600 font-medium">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {catalog.find(c => c.id === p.opportunityId)?.name || p.name || 'Unknown Course'}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200">Pending</span>
              </span>
              {p.justification && (
                <span className="text-xs text-slate-400 italic line-clamp-1" title={p.justification}>"{p.justification}"</span>
              )}
            </div>
          </td>
          <td className="py-4 px-4 text-right">
            <div className="flex gap-2 justify-end">
              <button onClick={() => handleAccept(p.id, p.opportunityId)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Approve</button>
              <button onClick={() => handleReject(p.id)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all">Reject</button>
            </div>
          </td>
        </tr>
      ))}
      
      {processed.map(p => (
        <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors opacity-75">
          <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-xs">
              {(userDoc.studentName || 'S').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">{userDoc.studentName || 'Unknown Student'}</span>
            </div>
          </td>
          <td className="py-4 px-4 text-slate-500 font-medium">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2">
                {catalog.find(c => c.id === p.opportunityId)?.name || p.name || 'Unknown Course'}
                {p.status === 'planned' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider border border-emerald-200">Approved</span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider border border-red-200">Rejected</span>
                )}
              </span>
            </div>
          </td>
          <td className="py-4 px-4 text-right">
            <div className="flex gap-2 justify-end">
              <button onClick={() => handleUndo(p.id, p.opportunityId, p.status)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all">Undo</button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

