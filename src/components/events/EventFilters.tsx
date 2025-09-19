"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { nakuruSubCounties } from '@/lib/data';

export function EventFilters() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
      <Input
        placeholder="Search events..."
        className="w-full md:w-[200px]"
      />
      <Select>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="All Sub-counties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sub-counties</SelectItem>
          {nakuruSubCounties.map(county => (
            <SelectItem key={county} value={county.toLowerCase().replace(' ', '-')}>{county}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="price-asc">Price: Low to High</SelectItem>
          <SelectItem value="price-desc">Price: High to Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
