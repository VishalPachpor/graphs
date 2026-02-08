'use client';

import { useState, ReactNode } from 'react';
import { Home, GitBranch, Search, Settings } from 'lucide-react';

type Tab = 'home' | 'graph' | 'search' | 'settings';

interface MobileLayoutProps {
    children: ReactNode;
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'graph', label: 'Graph', icon: GitBranch },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'settings', label: 'More', icon: Settings },
];

export function MobileLayout({ children, activeTab, onTabChange }: MobileLayoutProps) {
    return (
        <div className="flex flex-col h-screen bg-[#0a0a0f]">
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto pb-20">
                {children}
            </main>

            {/* Tab Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0F0F13] border-t border-gray-800/50 px-2 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isActive
                                        ? 'text-blue-400'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                                <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
