import React from 'react';
import { useState } from 'react';
import MapView from './components/MapView';
import SidePanel, { Account } from './components/SidePanel';
import type { Classroom } from './components/MapView';
import { GraduationCap } from 'lucide-react';
import { createUser, createClique, sendMessage } from './api';


const defaultAccount: Account = {
  id: 'account-1',
  classroomName: 'My Classroom',
  location: 'San Francisco, USA',
  size: 25,
  description: 'A friendly learning environment focused on STEM subjects and outdoor activities.',
  interests: ['Math', 'Biology'],
  schedule: {
    Mon: [9, 10, 11, 14, 15],
    Tue: [9, 10, 11],
    Wed: [14, 15, 16],
    Thu: [9, 10, 11],
    Fri: [14, 15],
  },
  x: 18,
  y: 37,
  recentCalls: [
    {
      id: 'call-1',
      classroomId: '1',
      classroomName: "Lee's Classroom",
      timestamp: new Date('2025-11-03T14:30:00'),
      duration: 45,
      type: 'outgoing' as const,
    },
    {
      id: 'call-2',
      classroomId: '2',
      classroomName: 'Math Nerd House',
      timestamp: new Date('2025-11-02T10:15:00'),
      duration: 30,
      type: 'incoming' as const,
    },
    {
      id: 'call-3',
      classroomId: '5',
      classroomName: 'Studio Ghibli Fan Club',
      timestamp: new Date('2025-11-01T16:00:00'),
      duration: 0,
      type: 'missed' as const,
    },
  ],
  friends: [
    {
      id: 'friend-1',
      classroomId: '1',
      classroomName: "Lee's Classroom",
      location: 'Tokyo, Japan',
      addedDate: new Date('2025-10-15'),
      lastConnected: new Date('2025-11-03'),
    },
    {
      id: 'friend-2',
      classroomId: '2',
      classroomName: 'Math Nerd House',
      location: 'Berlin, Germany',
      addedDate: new Date('2025-10-20'),
      lastConnected: new Date('2025-11-02'),
    },
    {
      id: 'friend-3',
      classroomId: '7',
      classroomName: 'Outdoor Adventure Squad',
      location: 'Denver, USA',
      addedDate: new Date('2025-10-25'),
    },
  ],
};

export default function App() {
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | undefined>();
  const [accounts, setAccounts] = useState<Account[]>([defaultAccount]);
  const [currentAccountId, setCurrentAccountId] = useState(defaultAccount.id);

  const currentAccount = accounts.find(acc => acc.id === currentAccountId) || defaultAccount;

  const handleClassroomSelect = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
  };

  const handleAccountChange = (accountId: string) => {
    setCurrentAccountId(accountId);
  };

  const handleAccountUpdate = (updatedAccount: Account) => {
    setAccounts(accounts.map(acc => 
      acc.id === updatedAccount.id ? updatedAccount : acc
    ));
  };

  const handleAccountCreate = (newAccount: Account) => {
    setAccounts([...accounts, newAccount]);
    setCurrentAccountId(newAccount.id);
  };

  const handleTest = async () => {
    const user = await createUser("Parn");
    console.log("Created user:", user);
  };


  return (
    <div className="h-screen w-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-slate-900 text-xl">Classroom Connect</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">MirrorMirror</div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-700 text-sm">
              {currentAccount.classroomName.charAt(0)}
            </div>
          </div>
        </div>
        <div>
          <button onClick={handleTest}>Test API</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Area */}
        <div className="flex-1 p-6">
          <MapView 
            onClassroomSelect={handleClassroomSelect} 
            selectedClassroom={selectedClassroom}
            myClassroom={currentAccount}
          />
        </div>

        {/* Side Panel */}
        <SidePanel 
          selectedClassroom={selectedClassroom}
          onClassroomSelect={handleClassroomSelect}
          currentAccount={currentAccount}
          accounts={accounts}
          onAccountChange={handleAccountChange}
          onAccountUpdate={handleAccountUpdate}
          onAccountCreate={handleAccountCreate}
        />
      </div>
    </div>
  );
}
