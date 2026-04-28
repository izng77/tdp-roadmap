import React from 'react';
import { signOut, User } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { cn } from '../../utils';
import { Profile } from '../../types';

interface SettingsTabProps {
    user: User;
    profile: Profile;
    activeTab: number;
}

export function SettingsTab({ user, profile, activeTab }: SettingsTabProps) {
    return (
        <div className={cn("flex-1 overflow-y-auto w-full px-margin-mobile md:px-0 py-stack-lg md:py-section-gap no-scrollbar animate-fadeIn", activeTab === 4 ? "block" : "hidden")}>
            <section className="mb-section-gap px-margin-mobile md:px-0 max-w-3xl">
                <h2 className="font-display-xl text-display-xl text-on-surface mb-stack-sm">Settings</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl text-slate-500 mb-8">Manage your account preferences and view profile information.</p>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-display font-bold text-2xl shrink-0">
                            {profile.studentName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-display font-bold text-xl text-slate-900">{profile.studentName}</h3>
                            <p className="text-slate-500 text-sm">{user?.email}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50">
                        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 mb-4 hover:border-slate-200 transition-colors">
                            <div>
                                <div className="font-bold text-slate-900 text-sm mb-1">Sign Out</div>
                                <div className="text-xs text-slate-500">Log out on this device.</div>
                            </div>
                            <button onClick={() => signOut(auth)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-lg text-xs tracking-wider transition-colors">Logout</button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}