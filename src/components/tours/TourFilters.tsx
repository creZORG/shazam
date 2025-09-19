
"use client";

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '../ui/button';
import { Loader2, Search } from 'lucide-react';
import type { FilterState } from '@/app/tours/actions';

interface TourFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  isSearching: boolean;
  destinations: string[];
}

export function TourFilters({ onFilterChange, isSearching, destinations }: TourFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({});

  const handleInputChange = (field: keyof FilterState, value: string) => {
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
  
  return (
    <div className="p-6 rounded-lg bg-card/80 backdrop-blur-sm shadow-2xl border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2">
                <label htmlFor="search" className="text-sm font-medium text-muted-foreground">Looking for...</label>
                <Input
                    id="search"
                    placeholder="Search for tours or destinations"
                    className="mt-1"
                    value={filters.search || ''}
                    onChange={(e) => handleInputChange('search', e.target.value)}
                />
            </div>
             <div >
                <label htmlFor="destination" className="text-sm font-medium text-muted-foreground">Destination</label>
                <Select onValueChange={(value) => handleInputChange('destination', value)} value={filters.destination}>
                    <SelectTrigger id="destination" className="w-full mt-1">
                        <SelectValue placeholder="All Destinations" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Destinations</SelectItem>
                    {destinations.map(dest => (
                        <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
             <Button size="lg" className="w-full h-11 bg-gradient-to-r from-primary to-accent text-white" onClick={handleApplyFilters} disabled={isSearching}>
                {isSearching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                Find Tours
            </Button>
        </div>
    </div>
  );
}
