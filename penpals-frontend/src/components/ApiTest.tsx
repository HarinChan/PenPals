// Test component for API integration

import React, { useState } from 'react';
import { 
  AuthService, 
  AccountService, 
  ClassroomService,
  type LoginCredentials,
  type RegisterData,
  type CreateClassroomData 
} from '../services';
import { useAuth, useAsyncAction } from '../hooks/useApi';

export const ApiTest: React.FC = () => {
  const { isAuthenticated, login, logout } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  // Login action
  const loginAction = useAsyncAction(
    (credentials: LoginCredentials) => AuthService.login(credentials),
    {
      onSuccess: () => addResult('✅ Login successful'),
      onError: (error) => addResult(`❌ Login failed: ${error.message}`),
    }
  );

  // Register action
  const registerAction = useAsyncAction(
    (data: RegisterData) => AuthService.register(data),
    {
      onSuccess: () => addResult('✅ Registration successful'),
      onError: (error) => addResult(`❌ Registration failed: ${error.message}`),
    }
  );

  // Create classroom action
  const createClassroomAction = useAsyncAction(
    (data: CreateClassroomData) => ClassroomService.createClassroom(data),
    {
      onSuccess: (result) => addResult(`✅ Classroom created: ${result.classroom.name}`),
      onError: (error) => addResult(`❌ Classroom creation failed: ${error.message}`),
    }
  );

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testRegister = async () => {
    const testData: RegisterData = {
      email: `test${Date.now()}@example.com`,
      password: 'TestPass123!',
      organization: 'Test School',
    };

    try {
      await registerAction.execute(testData);
    } catch (error) {
      // Error already handled in onError callback
    }
  };

  const testLogin = async () => {
    const credentials: LoginCredentials = {
      email: 'teacher@example.com',
      password: 'TestPass123!',
    };

    try {
      await loginAction.execute(credentials);
    } catch (error) {
      // Error already handled in onError callback
    }
  };

  const testCreateClassroom = async () => {
    if (!isAuthenticated) {
      addResult('❌ Must be logged in to create classroom');
      return;
    }

    const classroomData: CreateClassroomData = {
      name: `Test Classroom ${Date.now()}`,
      location: 'Test City',
      latitude: '51.5074',
      longitude: '-0.1278',
      class_size: 25,
      interests: ['science', 'technology', 'art'],
      availability: [
        { day: 'Monday', time: '10:00-11:00' },
        { day: 'Wednesday', time: '14:00-15:00' },
      ],
    };

    try {
      await createClassroomAction.execute(classroomData);
    } catch (error) {
      // Error already handled in onError callback
    }
  };

  const testSearchClassrooms = async () => {
    if (!isAuthenticated) {
      addResult('❌ Must be logged in to search classrooms');
      return;
    }

    try {
      const result = await ClassroomService.searchClassrooms({
        interests: ['science', 'art'],
        n_results: 5,
      });
      addResult(`✅ Found ${result.matched_classrooms.length} matching classrooms`);
    } catch (error) {
      addResult(`❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testGetAccountStats = async () => {
    if (!isAuthenticated) {
      addResult('❌ Must be logged in to get account stats');
      return;
    }

    try {
      const stats = await AccountService.getAccountStats();
      addResult(`✅ Account stats: ${stats.total_classrooms} classrooms, ${stats.total_connections} connections`);
    } catch (error) {
      addResult(`❌ Get stats failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      addResult('✅ Logged out successfully');
    } catch (error) {
      addResult(`❌ Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PenPals API Test</h1>
      
      <div className="mb-6">
        <p className="mb-2">
          <strong>Authentication Status:</strong> 
          <span className={`ml-2 px-2 py-1 rounded text-sm ${
            isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Authentication Tests</h2>
          <button
            onClick={testRegister}
            disabled={registerAction.loading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {registerAction.loading ? 'Registering...' : 'Test Register'}
          </button>
          <button
            onClick={testLogin}
            disabled={loginAction.loading}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loginAction.loading ? 'Logging in...' : 'Test Login'}
          </button>
          <button
            onClick={handleLogout}
            disabled={!isAuthenticated}
            className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Logout
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Classroom Tests</h2>
          <button
            onClick={testCreateClassroom}
            disabled={createClassroomAction.loading || !isAuthenticated}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {createClassroomAction.loading ? 'Creating...' : 'Test Create Classroom'}
          </button>
          <button
            onClick={testSearchClassrooms}
            disabled={!isAuthenticated}
            className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            Test Search Classrooms
          </button>
          <button
            onClick={testGetAccountStats}
            disabled={!isAuthenticated}
            className="w-full px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 disabled:opacity-50"
          >
            Test Account Stats
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Test Results</h2>
          <button
            onClick={clearResults}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Clear
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">No test results yet. Click a test button to start.</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <p><strong>Note:</strong> Make sure the backend server is running on http://localhost:5001</p>
        <p>The test will create accounts and classrooms with random data for testing purposes.</p>
      </div>
    </div>
  );
};