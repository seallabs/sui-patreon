'use client';

import { useUser } from '@/contexts/user-context';
import { CreatorSidebar } from './creator-sidebar';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AdaptiveLayoutProps {
  children: React.ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const { isCreatorMode } = useUser();

  return (
    <div className='flex min-h-screen overflow-x-hidden'>
      {/* Render the appropriate sidebar based on role */}
      {isCreatorMode ? <CreatorSidebar /> : <Sidebar />}

      <div className='flex-1 overflow-x-hidden pl-64'>
        <Header />
        {children}
      </div>
    </div>
  );
}
