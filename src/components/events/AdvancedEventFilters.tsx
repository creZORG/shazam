
"use client";

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { eventCategories, ageCategories } from '@/lib/data';
import { Button } from '../ui/button';
import { Loader2, Search } from 'lucide-react';
import type { FilterState } from '@/app/events/actions';

interface AdvancedEventFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  isSearching: boolean;
}

export function AdvancedEventFilters({ onFilterChange, isSearching }: AdvancedEventFiltersProps) {
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
  
  const dateRanges = ['Today', 'Tomorrow', 'This week', 'Next week', 'This month'];
  
  return (
    <div className="p-6 rounded-lg bg-card/80 backdrop-blur-sm shadow-2xl border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-2">
                <label htmlFor="search" className="text-sm font-medium text-muted-foreground">Looking for...</label>
                <Input
                    id="search"
                    placeholder="Search for events, artists, or venues"
                    className="mt-1 focus:ring-pink-500"
                    value={filters.search || ''}
                    onChange={(e) => handleInputChange('search', e.target.value)}
                />
            </div>
             <div >
                <label htmlFor="location" className="text-sm font-medium text-muted-foreground">Location</label>
                <Input
                    id="location"
                    placeholder="Enter county..."
                    className="mt-1"
                    value={filters.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                />
            </div>
             <div>
                <label htmlFor="category" className="text-sm font-medium text-muted-foreground">Category</label>
                <Select onValueChange={(value) => handleInputChange('category', value)} value={filters.category}>
                    <SelectTrigger id="category" className="w-full mt-1 border-pink-500/50 focus:ring-pink-500">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {eventCategories.map(category => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <Button size="lg" className="w-full h-11 bg-gradient-to-r from-primary to-accent text-white" onClick={handleApplyFilters} disabled={isSearching}>
                {isSearching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                Find Events
            </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
             <div>
                <label htmlFor="age" className="text-sm font-medium text-muted-foreground">Age Category</label>
                <Select onValueChange={(value) => handleInputChange('age', value)} value={filters.age}>
                    <SelectTrigger id="age" className="w-full mt-1 border-pink-500/50 focus:ring-pink-500">
                        <SelectValue placeholder="All Ages" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Ages</SelectItem>
                        {ageCategories.map(age => (
                            <SelectItem key={age} value={age}>{age}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <label htmlFor="date-range" className="text-sm font-medium text-muted-foreground">Date</label>
                <Select onValueChange={(value) => handleInputChange('dateRange', value)} value={filters.dateRange}>
                    <SelectTrigger id="date-range" className="w-full mt-1 border-pink-500/50 focus:ring-pink-500">
                        <SelectValue placeholder="Anytime" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Anytime</SelectItem>
                        {dateRanges.map(range => (
                            <SelectItem key={range} value={range.toLowerCase().replace(' ', '-')}>{range}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div>
                <label htmlFor="sort" className="text-sm font-medium text-muted-foreground">Sort By</label>
                <Select onValueChange={(value) => handleInputChange('sort', value)} value={filters.sort}>
                    <SelectTrigger id="sort" className="w-full mt-1 border-pink-500/50 focus:ring-pink-500">
                        <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="price-asc">Price: Low to High</SelectItem>
                        <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    </div>
  );
}
