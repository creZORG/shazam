
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { NightlifeEvent } from '@/lib/types';

export interface NightlifeFilterState {
  search?: string;
  club?: string;
  entry?: string;
}

interface NightlifeFiltersProps {
    events: NightlifeEvent[];
    onFilterChange: (filters: NightlifeFilterState) => void;
    isSearching: boolean;
}

export function NightlifeFilters({ events, onFilterChange, isSearching }: NightlifeFiltersProps) {
    const [filters, setFilters] = useState<NightlifeFilterState>({});

    const clubs = useMemo(() => {
        const clubNames = events.map(event => event.clubName);
        return [...new Set(clubNames)]; // Get unique club names
    }, [events]);

    const handleInputChange = (field: keyof NightlifeFilterState, value: string) => {
        setFilters(prev => {
            const newFilters = {...prev};
            if (value === 'all' || !value) {
                delete newFilters[field];
            } else {
                newFilters[field] = value;
            }
            return newFilters;
        });
    };
    
    const handleApplyFilters = () => {
        onFilterChange(filters);
    };

    const handleClearFilters = () => {
        setFilters({});
        onFilterChange({});
    }
    
    const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="p-6 rounded-lg bg-card shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2">
                <label htmlFor="search" className="text-sm font-medium text-muted-foreground">Search events or DJs...</label>
                <Input
                    id="search"
                    placeholder="e.g., Afrobeat Invasion"
                    className="mt-1"
                    value={filters.search || ''}
                    onChange={(e) => handleInputChange('search', e.target.value)}
                />
            </div>
             <div >
                <label htmlFor="club" className="text-sm font-medium text-muted-foreground">Club</label>
                <Select value={filters.club || 'all'} onValueChange={(value) => handleInputChange('club', value)}>
                    <SelectTrigger id="club" className="w-full mt-1">
                        <SelectValue placeholder="All Clubs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Clubs</SelectItem>
                        {clubs.map(club => (
                            <SelectItem key={club} value={club}>{club}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label htmlFor="entry" className="text-sm font-medium text-muted-foreground">Entry</label>
                <Select value={filters.entry || 'all'} onValueChange={(value) => handleInputChange('entry', value)}>
                    <SelectTrigger id="entry" className="w-full mt-1">
                        <SelectValue placeholder="Paid & Free" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
         <div className="flex flex-col sm:flex-row justify-end mt-4 gap-2">
            {hasActiveFilters && (
                 <Button variant="ghost" onClick={handleClearFilters}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filters
                </Button>
            )}
             <Button size="lg" className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500" onClick={handleApplyFilters} disabled={isSearching}>
                <Search className="mr-2 h-5 w-5" />
                Find Events
            </Button>
        </div>
    </div>
  );
}
