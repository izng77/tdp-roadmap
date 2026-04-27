import React, { useState } from 'react';
1: import React, { useState } from 'react';
2: import { LayoutDashboard, Users, BookOpen, TrendingUp, Bell, Database, Image as ImageIcon, Pencil, X, Plus, Flame, CheckCircle2, Upload } from 'lucide-react';
3: import { doc, deleteDoc, getDocs, collection, writeBatch, updateDoc } from 'firebase/firestore';
4: import { signOut, User } from 'firebase/auth';
5: import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
6: import { Opportunity, Profile } from '../../types';
7: import { cn, categorizeDomain, getTierName } from '../../utils';
8: import { TopNavBar, SideNavBar, DesktopTopBar, BottomNavBar } from '../../components/Navigation';
9: import { PendingUserRequests } from '../../components/PendingUserRequests';
10: 
11: interface AdminDashboardProps {
12:     user: User;
13:     profile: Profile;
14:     setProfile: React.Dispatch<React.SetStateAction<Profile>>;
15:     catalog: Opportunity[];
16:     setCatalog: React.Dispatch<React.SetStateAction<Opportunity[]>>;
17:     users: any[];
18:     activeTab: number;
19:     setActiveTab: React.Dispatch<React.SetStateAction<number>>;
20:     isAdminUser: boolean;
21:     isSuperAdminUser: boolean;
22:     showAdminPanel: boolean;
23:     setShowAdminPanel: React.Dispatch<React.SetStateAction<boolean>>;
24:     toast: { msg: string; type: 'success' | 'err' } | null;
25:     showNotification: (msg: string, type?: 'success' | 'err') => void;
26:     handleSeedData: () => Promise<void>;
27:     handleFileUpload: (e: any) => Promise<void>;
28:     domainDistribution: any;
29:     focusMode: boolean;
30:     setFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
31: }
32: 
33: export function AdminDashboard({
34:     user, profile, setProfile, catalog, setCatalog, users,
35:     activeTab, setActiveTab, isAdminUser, isSuperAdminUser,
36:     showAdminPanel, setShowAdminPanel, toast, showNotification,
37:     handleSeedData, handleFileUpload, domainDistribution,
38:     focusMode, setFocusMode
39: }: AdminDashboardProps) {
40:     // Local Admin State (Moved from App.tsx)
41:     const [editingImageId, setEditingImageId] = useState<string | null>(null);
42:     const [editedImageUrl, setEditedImageUrl] = useState<string>("");
43:     const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
44:     const [editingCourseData, setEditingCourseData] = useState<Partial<Opportunity> | null>(null);
45:     const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
46:     const [catalogFilterLevel, setCatalogFilterLevel] = useState<'all' | 'mine'>('all');
47: 
48:     return (
49:         <div className="flex flex-col min-h-screen bg-background font-body-sm text-on-background selection:bg-blue-100">
50:             <TopNavBar user={user} profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
51:             <SideNavBar profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} isAdminUser={isAdminUser} showAdminPanel={showAdminPanel} setShowAdminPanel={setShowAdminPanel} />
52: 
53:             <main className="flex-1 md:ml-[88px] md:mr-[88px] flex flex-col min-w-0 bg-[#F8FAFC]/50 pb-32 min-h-screen transition-all duration-300">
54:                 <DesktopTopBar profile={profile} focusMode={focusMode} setFocusMode={setFocusMode} />
55: 
56:                 <div className="w-full max-w-[1200px] mx-auto px-margin-mobile md:px-0 py-stack-lg md:py-section-gap">
57:                     <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
58:                         <div>
59:                             <h1 className="font-display font-black text-4xl text-primary tracking-tighter">Teacher Console</h1>
60:                             <p className="text-base font-medium text-on-surface-variant mt-2 opacity-60">Strategic management of talent development pathways and student progress.</p>
61:                         </div>
62:                         <button onClick={() => setShowAdminPanel(false)} className="px-8 py-3.5 bg-surface-dim text-primary font-black text-[10px] rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] shadow-sm border border-outline-variant flex items-center gap-2.5 active:scale-95">
63:                             <LayoutDashboard className="w-4 h-4" /> Switch to Student View
64:                         </button>
65:                     </div>
66: 
67:                     {/* Overview Tab */}
68:                     <div className={cn("flex-col gap-6", activeTab === 0 ? "flex animate-fadeIn" : "hidden")}>
69:                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
70:                             <div className="pro-card p-8 flex items-center gap-6 bg-white">
71:                                 <div className="w-14 h-14 rounded-2xl bg-primary/5 text-primary flex items-center justify-center shrink-0 border border-primary/10">
72:                                     <Users className="w-7 h-7" />
73:                                 </div>
74:                                 <div>
75:                                     <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Total Students</h3>
76:                                     <p className="font-display text-4xl font-black text-primary tabular-nums">{users.length}</p>
77:                                 </div>
78:                             </div>
79:                             <div className="pro-card p-8 flex items-center gap-6 bg-white">
80:                                 <div className="w-14 h-14 rounded-2xl bg-secondary/5 text-secondary flex items-center justify-center shrink-0 border border-secondary/10">
81:                                     <BookOpen className="w-7 h-7" />
82:                                 </div>
83:                                 <div>
84:                                     <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Active Courses</h3>
85:                                     <p className="font-display text-4xl font-black text-primary tabular-nums">{catalog.length}</p>
86:                                 </div>
87:                             </div>
88:                             <div className="pro-card p-8 flex items-center gap-6 bg-white">
89:                                 <div className="w-14 h-14 rounded-2xl bg-success/5 text-success flex items-center justify-center shrink-0 border border-success/10">
90:                                     <TrendingUp className="w-7 h-7" />
91:                                 </div>
92:                                 <div>
93:                                     <h3 className="font-black text-outline text-[10px] uppercase tracking-[0.2em] mb-1">Avg Engagement</h3>
94:                                     <p className="font-display text-4xl font-black text-primary tabular-nums">78%</p>
95:                                 </div>
96:                             </div>
97:                         </div>
98: 
99:                         <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
100:                             <h3 className="font-display font-bold text-xl text-slate-900 mb-6">Recent Activity Notifications</h3>
101:                             <div className="space-y-4">
102:                                 {[
103:                                     "New cohort of 150 students onboarded for 2026 Academic Year.",
104:                                     "Course 'Design Thinking Workshop' (Tier 1) updated by admin.",
105:                                     "Student progression rate reached new milestone in Science Domain.",
106:                                     "System weekly automated backup completed smoothly."
107:                                 ].map((act, i) => (
108:                                     <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
109:                                         <Bell className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
110:                                         <div>
111:                                             <p className="text-slate-700 font-medium">{act}</p>
112:                                             <p className="text-xs text-slate-400 mt-1">{i * 2 + 1} hours ago</p>
113:                                         </div>
114:                                     </div>
115:                                 ))}
116:                             </div>
117:                         </div>
118:                     </div>
119: 
120:                     <div className={cn(activeTab === 1 ? "block animate-fadeIn" : "hidden")}>
121:                         <div className="pro-card p-10 bg-white">
122:                             <h2 className="font-display font-black text-2xl text-primary tracking-tight mb-4">Catalog Management</h2>
123:                             <p className="text-sm font-medium text-on-surface-variant opacity-60 mb-10 max-w-2xl">
124:                                 Orchestrate the talent development catalog. Synchronize with Google Sheets or manage individual course properties.
125:                             </p>
126: 
127:                             <div className="flex flex-wrap gap-3">
128:                                 {isSuperAdminUser && (
129:                                     <>
130:                                         <button onClick={async () => { handleSeedData(); }} className="px-6 py-3 bg-primary text-white text-[10px] font-black rounded-xl hover:bg-primary/90 transition-all uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95">
131:                                             Seed Database
132:                                         </button>
133: 
134:                                         <button
135:                                             onClick={async () => {
136:                                                 try {
137:                                                     const isMock = user.uid.startsWith('mock_');
138:                                                     let b = !isMock ? writeBatch(db) : null;
139:                                                     let count = 0;
140:                                                     const newCatalog = catalog.map(item => ({ ...item, domain: categorizeDomain(item.name) }));
141:                                                     if (!isMock && b) {
142:                                                         for (const item of catalog) {
143:                                                             b.update(doc(db, 'opportunities', item.id), { domain: categorizeDomain(item.name) });
144:                                                             count++;
145:                                                             if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
146:                                                         }
147:                                                         if (count > 0) await b.commit();
148:                                                     } else {
149:                                                         setCatalog(newCatalog);
150:                                                     }
151:                                                     showNotification(isMock ? 'Simulated: Re-mapped all domains locally' : 'Re-mapped all domains successfully', 'success');
152:                                                 } catch (e) {
153:                                                     handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
154:                                                 }
155:                                             }}
156:                                             className="px-6 py-3 bg-surface-dim text-primary border border-outline-variant text-[10px] font-black rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] active:scale-95"
157:                                         >
158:                                             Auto-Categorize
159:                                         </button>
160: 
161:                                         <button
162:                                             onClick={async () => {
163:                                                 try {
164:                                                     showNotification("Recalculating enrollments from user data...", "success");
165:                                                     const usersSnapshot = await getDocs(collection(db, 'users'));
166:                                                     const courseCounts: Record<string, number> = {};
167:                                                     for (const userDoc of usersSnapshot.docs) {
168:                                                         const coursesSnap = await getDocs(collection(db, 'users', userDoc.id, 'courses'));
169:                                                         coursesSnap.forEach(c => {
170:                                                             if (c.data().status === 'planned' || c.data().status === 'completed') {
171:                                                                 const oppId = c.data().opportunityId;
172:                                                                 courseCounts[oppId] = (courseCounts[oppId] || 0) + 1;
173:                                                             }
174:                                                         });
175:                                                     }
176:                                                     let b = writeBatch(db);
177:                                                     let count = 0;
178:                                                     for (const item of catalog) {
179:                                                         b.update(doc(db, 'opportunities', item.id), { enrolled: courseCounts[item.id] || 0 });
180:                                                         count++;
181:                                                         if (count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
182:                                                     }
183:                                                     if (count > 0) await b.commit();
184:                                                     showNotification('Enrollments recalculated successfully based on actual user data.', 'success');
185:                                                 } catch (e) {
186:                                                     handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
187:                                                 }
188:                                             }}
189:                                             className="px-6 py-3 bg-error/5 text-error border border-error/20 text-[10px] font-black rounded-xl hover:bg-error/10 transition-all uppercase tracking-[0.2em] active:scale-95"
190:                                         >
191:                                             Sync Enrollment
192:                                         </button>
193: 
194:                                         <button
195:                                             onClick={async () => {
196:                                                 try {
197:                                                     const isMock = user.uid.startsWith('mock_');
200:                                                     const newCatalog = [...catalog];
201:                                                     for (let i = 0; i < newCatalog.length; i++) {
202:                                                         const item = newCatalog[i];
203:                                                         if (!item.image || item.image.includes('dicebear.com') || item.image.includes('loremflickr.com') || item.image.includes('placeholder')) {
204:                                                             const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(item.name + ' course educational abstract')}?width=600&height=400&nologo=true`;
205:                                                             if (b) b.update(doc(db, 'opportunities', item.id), { image: newUrl });
206:                                                             newCatalog[i] = { ...item, image: newUrl };
207:                                                             count++;
208:                                                             if (b && count === 400) { await b.commit(); b = writeBatch(db); count = 0; }
209:                                                         }
210:                                                     }
211:                                                     if (b && count > 0) await b.commit();
212:                                                     if (isMock) {
213:                                                         setCatalog(newCatalog);
214:                                                         localStorage.setItem('mock_catalog', JSON.stringify(newCatalog));
215:                                                         showNotification(`Simulated: Generated thumbnails for ${count} items locally.`, 'success');
216:                                                     } else {
217:                                                         showNotification(`Successfully generated thumbnails for ${count} items in database.`, 'success');
218:                                                     }
219:                                                 } catch (e) {
220:                                                     console.error("Thumbnail Generation Error:", e);
221:                                                     handleFirestoreError(e, OperationType.UPDATE, 'opportunities');
222:                                                 }
223:                                             }}
224:                                             className="px-6 py-3 bg-surface-dim text-primary border border-outline-variant text-[10px] font-black rounded-xl hover:bg-surface-bright transition-all uppercase tracking-[0.2em] flex items-center gap-2 active:scale-95"
225:                                         >
226:                                             <ImageIcon className="w-4 h-4" /> Thumbnails
227:                                         </button>
228: 
229:                                         <label className="flex items-center justify-center px-6 py-3 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group active:scale-95">
230:                                             <input type="file" className="hidden" accept=".json,.csv,.xlsx,.xls" onChange={handleFileUpload} />
231:                                             <Upload className="w-4 h-4 mr-2 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
232:                                             <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Bulk Import</span>
233:                                         </label>
234:                                     </>
235:                                 )}
236:                                 <button
237:                                     onClick={() => {
238:                                         setEditingCourseId('new-' + Date.now().toString());
239:                                         setEditingCourseData({ name: '', domain: '', tier: 1, enrolled: 0, capacity: 20, ownerEmails: user?.email ? [user.email] : [] });
240:                                     }}
241:                                     className="px-6 py-3 bg-success text-white text-[10px] font-black rounded-xl hover:bg-success/90 shadow-lg shadow-success/20 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-95 ml-auto"
242:                                 >
243:                                     <Plus className="w-5 h-5" /> Add Course
244:                                 </button>
245:                             </div>
246: 
247:                             <div className="mt-8 border-t border-slate-200 pt-8">
248:                                 <div className="flex justify-between items-end mb-4">
249:                                     <h3 className="font-display font-bold text-xl text-slate-900 mb-4">Live Catalog Overview</h3>
250:                                     <div className="flex bg-slate-100 p-1 rounded-full">
251:                                         <button onClick={() => setCatalogFilterLevel('all')} className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'all' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}>All Courses</button>
252:                                         <button onClick={() => setCatalogFilterLevel('mine')} className={cn("px-4 py-1.5 text-sm font-label-bold text-label-bold rounded-full transition-all", catalogFilterLevel === 'mine' ? "bg-white text-[#0151B1] shadow-sm" : "text-slate-500 hover:text-slate-700")}>Assigned to Me</button>
253:                                     </div>
254:                                 </div>
255:                                 <div className="h-[500px] overflow-y-auto bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-inner custom-scrollbar">
256:                                     {catalog.length === 0 ? (
257:                                         <div className="flex flex-col items-center justify-center h-full text-slate-400">
258:                                             <Database className="w-8 h-8 mb-2 opacity-50" />
259:                                             <p className="font-body-sm text-body-sm">Catalog is empty. Please seed or import data.</p>
260:                                         </div>
261:                                     ) : (
262:                                         <ul className="space-y-2">
263:                                             {catalog.filter(item => catalogFilterLevel === 'all' || (item.ownerEmails?.includes(user?.email || ''))).map(item => (
264:                                                 <li key={item.id} className="p-3 bg-white border border-slate-200 rounded-lg flex justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-blue-200 transition-colors items-center">
265:                                                     <div className="flex items-center gap-3">
266:                                                         <div className="relative group/thumbnail shrink-0 cursor-pointer">
267:                                                             {item.image ? (
268:                                                                 <img src={item.image} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
269:                                                             ) : (
270:                                                                 <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
271:                                                                     <ImageIcon className="w-4 h-4 text-slate-400" />
272:                                                                 </div>
273:                                                             )}
274:                                                         </div>
275:                                                         <span className="font-body-lg text-body-lg font-semibold text-slate-800">{item.name}</span>
276:                                                     </div>
277:                                                     <div className="flex gap-2 items-center mt-1 flex-wrap">
278:                                                         <span className={cn("px-2 py-1 text-xs rounded-full font-label-bold text-label-bold", item.tier === 1 ? "bg-emerald-100 text-emerald-800" : item.tier === 2 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800")}>{getTierName(item.tier)}</span>
279:                                                         <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-label-bold text-label-bold uppercase tracking-wider border border-slate-200">{item.domain}</span>
280: 
281:                                                         {(isSuperAdminUser || (user?.email && item.ownerEmails?.includes(user?.email))) && (
282:                                                             <>
283:                                                                 <button onClick={() => { setEditingCourseId(item.id); setEditingCourseData({ ...item, description: item.description || 'Master core concepts.' }); }} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors ml-2" title="Edit Details"><Pencil className="w-4 h-4" /></button>
284:                                                                 <button onClick={() => { setEditingImageId(item.id); setEditedImageUrl(item.image || ""); }} className="p-1 hover:bg-slate-100 text-slate-400 hover:text-[#0151B1] rounded-md transition-colors" title="Edit Thumbnail"><ImageIcon className="w-4 h-4" /></button>
285:                                                                 {isSuperAdminUser && (
286:                                                                     <button onClick={async () => {
287:                                                                         try {
288:                                                                             const isMock = user.uid.startsWith('mock_');
289:                                                                             if (!isMock) await deleteDoc(doc(db, 'opportunities', item.id));
290:                                                                             else setCatalog(catalog.filter(o => o.id !== item.id));
291:                                                                             showNotification('Removed successfully', 'success');
292:                                                                         } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'opportunities'); }
293:                                                                     }} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors ml-1" title="Delete Item"><X className="w-4 h-4" /></button>
294:                                                                 )}
295:                                                             </>
296:                                                         )}
297:                                                     </div>
298:                                                 </li>
299:                                             ))}
300:                                         </ul>
301:                                     )}
302:                                 </div>
303:                             </div>
304:                         </div>
305:                     </div>
306: 
307:                     {/* Additional Tabs (Students, Requests, Analytics, Settings) */}
308:                     {/* NOTE: Extracted as-is from App.tsx */}
309:                     <div className={cn("flex flex-col animate-fadeIn", activeTab === 2 ? "flex" : "hidden")}>
310:                         <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
311:                             <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Student Directory</h2>
312:                             <p className="text-slate-500 mb-6">Manage student profiles and view overall progress records.</p>
313:                             <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
314:                                 <table className="w-full text-left border-collapse">
315:                                     <thead>
316:                                         <tr className="border-b border-slate-200">
317:                                             <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
318:                                             <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
319:                                         </tr>
320:                                     </thead>
321:                                     <tbody>
322:                                         {users.map(u => (
323:                                             <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
324:                                                 <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-3">
325:                                                     <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">{(u.studentName || 'S').substring(0, 2).toUpperCase()}</div>
326:                                                     {u.studentName || 'Unknown Student'}
327:                                                 </td>
328:                                                 <td className="py-4 px-4 text-slate-500 hidden md:table-cell">{u.email}</td>
329:                                             </tr>
330:                                         ))}
331:                                     </tbody>
332:                                 </table>
333:                             </div>
334:                         </div>
335:                     </div>
336: 
337:                     {/* Pending Requests Tab */}
338:                     <div className={cn("flex flex-col animate-fadeIn", activeTab === 3 ? "flex" : "hidden")}>
339:                         <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
340:                             <h2 className="font-headline-lg text-headline-lg font-display font-bold text-slate-900 mb-4">Enrollment Requests</h2>
341:                             <div className="h-[500px] overflow-y-auto w-full custom-scrollbar">
342:                                 <table className="w-full text-left border-collapse">
343:                                     <tbody>
344:                                         {users.map(u => (
345:                                             <PendingUserRequests key={u.id} userDoc={u} catalog={catalog} showNotification={showNotification} mockPending={u.id === user.uid && user.uid.startsWith('mock_') ? profile.pending : undefined} />
346:                                         ))}
347:                                     </tbody>
348:                                 </table>
349:                             </div>
350:                         </div>
351:                     </div>
352: 
353:                     {/* Analytics & Settings Tabs */}
354:                     <div className={cn("flex flex-col animate-fadeIn", activeTab === 4 ? "flex" : "hidden")}>
355:                         <div className="bg-white rounded-[2rem] p-8 border border-slate-200">
356:                             <h2 className="font-display font-bold text-slate-900 mb-4">School Analytics</h2>
357:                             <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 h-64 flex items-center justify-center">
358:                                 <TrendingUp className="w-12 h-12 text-slate-300 mb-4" />
359:                                 <div className="text-xl font-bold text-slate-700">Detailed Report Generation</div>
360:                             </div>
361:                         </div>
362:                     </div>
363: 
364:                     <div className={cn("flex flex-col animate-fadeIn", activeTab === 5 ? "flex" : "hidden")}>
365:                         <div className="bg-white rounded-[2rem] p-8 border border-slate-200">
366:                             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
367:                                 <div>
368:                                     <div className="font-bold text-slate-900">Sign Out</div>
369:                                     <div className="text-sm text-slate-500">Log out of your administrative session.</div>
370:                                 </div>
371:                                 <button onClick={() => signOut(auth)} className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-100 font-bold rounded-lg hover:bg-red-100">Sign Out</button>
372:                             </div>
373:                         </div>
374:                     </div>
375: 
376:                 </div>
377: 
378:                 {editingCourseId && editingCourseData && (
379:                     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
380:                         <div className="bg-white rounded-2xl p-10 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar border border-outline-variant transform transition-all duration-300 scale-100 opacity-100">
381:                             <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="absolute top-8 right-8 text-outline hover:text-primary transition-colors active:scale-90"><X className="w-6 h-6" /></button>
382:                             <h2 className="font-display font-black text-2xl text-primary tracking-tight mb-10">Course Configuration</h2>
383: 
384:                             <div className="space-y-8">
385:                                 <div className="space-y-2">
386:                                     <label className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Course Name</label>
387:                                     <input type="text" value={editingCourseData.name || ''} onChange={(e) => setEditingCourseData({ ...editingCourseData, name: e.target.value })} className="w-full bg-surface-dim border border-outline-variant rounded-xl p-4 outline-none focus:border-primary transition-colors font-bold text-primary" placeholder="e.g. Advanced Quantum Mechanics" />
388:                                 </div>
389:                                 <div className="flex justify-end gap-4 pt-6 border-t border-outline-variant/30">
390:                                     <button onClick={() => { setEditingCourseId(null); setEditingCourseData(null); }} className="px-8 py-3.5 rounded-xl text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-surface-dim transition-colors">Cancel</button>
391:                                     <button onClick={async () => {
392:                                         try {
393:                                             const isMock = user.uid.startsWith('mock_');
394:                                             if (!isMock) {
395:                                                 const b = writeBatch(db);
396:                                                 const cleanData = { ...editingCourseData };
397:                                                 if (cleanData.enrolled === undefined) cleanData.enrolled = 0;
398:                                                 delete (cleanData as any).id;
399: 
400:                                                 let docRef = doc(db, 'opportunities', editingCourseId as string);
401:                                                 if (editingCourseId?.startsWith('new-')) {
402:                                                     docRef = doc(collection(db, 'opportunities'));
403:                                                 }
404: 
405:                                                 b.set(docRef, cleanData, { merge: true });
406:                                                 await b.commit();
407:                                             } else {
408:                                                 const updatedCatalog = catalog.map(item => item.id === editingCourseId ? { ...editingCourseData, id: editingCourseId } as Opportunity : item);
409:                                                 setCatalog(updatedCatalog);
410:                                             }
411:                                             showNotification('Course configuration saved.', 'success');
412:                                             setEditingCourseId(null);
413:                                         } catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'opportunities'); }
414:                                     }} className="px-10 py-3.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95">Commit Changes</button>
415:                                 </div>
416:                             </div>
417:                         </div>
418:                     </div>
419:                 )}
420: 
421:                 {toast && (
422:                     <div className="fixed bottom-10 right-10 z-[200] animate-fadeInUp">
423:                         <div className={cn("glass-panel px-6 py-5 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20", toast.type === 'success' ? 'bg-success/90 text-white' : 'bg-error/90 text-white')}>
424:                             <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
425:                                 {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
426:                             </div>
427:                             <span className="font-black text-[11px] uppercase tracking-[0.1em]">{toast.msg}</span>
428:                         </div>
429:                     </div>
430:                 )}
431:                 <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} showAdminPanel={showAdminPanel} />
432:             </main>
433:         </div>
434:     );
435: }