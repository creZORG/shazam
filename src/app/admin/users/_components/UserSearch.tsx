'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { findUserByUsername } from '../actions';
import { UsersTable } from './UsersTable';
import type { FirebaseUser } from '@/lib/types';

export function UserSearch() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<(FirebaseUser & { id: string }) | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) {
        setError("Please enter a username to search.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setFoundUser(null);

    const result = await findUserByUsername(username);
    if (result.success && result.data) {
      setFoundUser(result.data);
    } else {
      setError(result.error || 'An error occurred.');
    }
    setIsLoading(false);
  };

  return (
    <div className="py-8 space-y-8">
      <div className="flex w-full max-w-sm items-center space-x-2 mx-auto">
        <Input
          type="text"
          placeholder="Enter username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isLoading || !username}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="sr-only">Search</span>
        </Button>
      </div>

      {error && (
        <div className="text-center text-destructive flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}

      {foundUser && <UsersTable users={[foundUser]} />}
    </div>
  );
}
