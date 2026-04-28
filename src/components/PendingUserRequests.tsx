import React, { useState, useMemo } from 'react';
import { doc, updateDoc, collectionGroup, onSnapshot, query, increment, where, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Opportunity } from '../types';
import { Search, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../utils';

export function PendingUserRequests({ catalog, showNotification }: { catalog: Opportunity[], showNotification: any }) {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    const q = query(
      collectionGroup(db, 'courses'),
      where('status', 'in', ['pending', 'drop_pending', 'completion_pending']),
      orderBy('addedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingRequests(requests);

      // Clean up selected IDs that might have been resolved by another admin
      setSelectedIds(prev => {
        const next = new Set(prev);
        const currentIds = new Set(requests.map(r => r.id));
        for (const id of next) if (!currentIds.has(id)) next.delete(id);
        return next;
      });

    }, (error) => {
      console.error("Collection group listener failed:", error);
      showNotification("Failed to load pending requests.", "err");
    });

    return () => unsubscribe();
  }, []);

  const catalogMap = useMemo(() => {
    const map = new Map<string, string>();
    catalog.forEach(c => map.set(c.id, c.name));
    return map;
  }, [catalog]);

  const filteredAndSortedRequests = useMemo(() => {
    let result = pendingRequests.map(p => ({
      ...p,
      resolvedCourseName: catalogMap.get(p.opportunityId) || p.name || 'Unknown Course'
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        (p.studentName || '').toLowerCase().includes(q) ||
        p.resolvedCourseName.toLowerCase().includes(q)
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;
        if (sortConfig.key === 'addedAt') {
          aVal = a.addedAt?.seconds || 0;
          bVal = b.addedAt?.seconds || 0;
        } else {
          aVal = sortConfig.key === 'studentName' ? (a.studentName || '').toLowerCase() : a[sortConfig.key] || '';
          bVal = sortConfig.key === 'studentName' ? (b.studentName || '').toLowerCase() : b[sortConfig.key] || '';
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [pendingRequests, searchQuery, sortConfig, catalogMap]);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const processBatch = async (items: any[], action: 'approve' | 'reject') => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      // Chunk items into batches of 250 (max 500 ops per batch)
      const chunkSize = 250;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const courseRef = doc(db, 'users', item.studentId, 'courses', item.id);
          const oppRef = doc(db, 'opportunities', item.opportunityId);

          if (action === 'approve') {
            if (item.status === 'pending') {
              batch.update(courseRef, { status: 'planned' });
              batch.update(oppRef, { enrolled: increment(1) });
            } else if (item.status === 'drop_pending') {
              batch.update(courseRef, { status: 'rejected' });
              batch.update(oppRef, { enrolled: increment(-1) });
            } else if (item.status === 'completion_pending') {
              batch.update(courseRef, { status: 'completed', completedAt: serverTimestamp() });
            }
          } else if (action === 'reject') {
            const isReversion = item.status === 'drop_pending' || item.status === 'completion_pending';
            batch.update(courseRef, { status: isReversion ? 'planned' : 'rejected' });
          }
        }
        await batch.commit();
      }
      showNotification(`Successfully processed ${items.length} requests.`, 'success');
      setSelectedIds(new Set());
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `bulk_requests`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    const itemsToProcess = filteredAndSortedRequests.filter(r => selectedIds.has(r.id));
    if (itemsToProcess.length === 0) return;
    processBatch(itemsToProcess, action);
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search students or courses..."
            id="enrollment-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 animate-fadeIn">
            <span className="text-xs font-bold text-blue-700 mr-2">{selectedIds.size} selected</span>
            <button
              disabled={isProcessing}
              onClick={() => handleBulkAction('approve')}
              className={cn(
                "flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-all",
                isProcessing && "opacity-50 cursor-not-allowed scale-100"
              )}
            >
              <Check className="w-3.5 h-3.5" /> {isProcessing ? 'Processing...' : 'Approve All'}
            </button>
            <button
              disabled={isProcessing}
              onClick={() => handleBulkAction('reject')}
              className={cn(
                "flex items-center gap-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm active:scale-95 transition-all",
                isProcessing && "opacity-50 cursor-not-allowed scale-100"
              )}
            >
              <X className="w-3.5 h-3.5" /> {isProcessing ? 'Wait...' : 'Reject All'}
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="h-[500px] overflow-y-auto w-full custom-scrollbar border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
            <tr>
              <th className="py-3 px-4 w-12 text-center">
                <input type="checkbox" checked={selectedIds.size === filteredAndSortedRequests.length && filteredAndSortedRequests.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('studentName')}><div className="flex items-center gap-1">Student <SortIcon columnKey="studentName" /></div></th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('resolvedCourseName')}><div className="flex items-center gap-1">Request Details <SortIcon columnKey="resolvedCourseName" /></div></th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('addedAt')}><div className="flex items-center gap-1">Date <SortIcon columnKey="addedAt" /></div></th>
              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRequests.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-medium">No pending requests found.</td></tr>
            ) : (
              filteredAndSortedRequests.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 text-center">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs shrink-0">{(p.studentName || 'S').substring(0, 2).toUpperCase()}</div>
                    <span className="truncate">{p.studentName || 'Unknown Student'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-600 font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-2">
                        {p.resolvedCourseName}
                        {p.status === 'drop_pending' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase tracking-wider border border-red-200">Drop Requested</span>
                        ) : p.status === 'completion_pending' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200">Completion Requested</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200">Enrollment Pending</span>
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
                        <button disabled={isProcessing} onClick={() => processBatch([p], 'approve')} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Approve Drop</button>
                      ) : p.status === 'completion_pending' ? (
                        <button disabled={isProcessing} onClick={() => processBatch([p], 'approve')} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Verify Completion</button>
                      ) : (
                        <button disabled={isProcessing} onClick={() => processBatch([p], 'approve')} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition-all">Approve</button>
                      )}
                      <button disabled={isProcessing} onClick={() => processBatch([p], 'reject')} className="bg-white border border-slate-200 disabled:opacity-50 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all">Reject</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
