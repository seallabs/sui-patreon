'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { DashboardQueryParams } from '@/services/dashboard';
import { Content, PostFilter, SubscriptionTier } from '@/types';
import { ChevronDown, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface RecentPostsProps {
  posts: Content[];
  tiers: SubscriptionTier[];
  onFilterChange?: (
    filters: Pick<DashboardQueryParams, 'type' | 'tier' | 'time' | 'search'>
  ) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

export function RecentPosts({
  posts,
  tiers,
  onFilterChange,
  onLoadMore,
  isLoadingMore,
}: RecentPostsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PostFilter>({
    type: 'all',
    tier: 'all',
    dateRange: 'all',
  });

  // Notify parent component when filters change
  const updateFilters = (newFilters: Partial<PostFilter>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    if (onFilterChange) {
      onFilterChange({
        type: updated.type,
        tier: updated.tier,
        time:
          updated.dateRange === 'all'
            ? 'all'
            : updated.dateRange === 'month'
            ? '30days'
            : '7days',
        search: searchQuery,
      });
    }
  };

  // Notify parent when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onFilterChange) {
      onFilterChange({
        type: filters.type,
        tier: filters.tier,
        time:
          filters.dateRange === 'all'
            ? 'all'
            : filters.dateRange === 'month'
            ? '30days'
            : '7days',
        search: value,
      });
    }
  };

  const postTypes = [
    { value: 'all', label: 'All types' },
    { value: 'video', label: 'Video' },
    { value: 'image', label: 'Image' },
    { value: 'audio', label: 'Audio' },
    { value: 'text', label: 'Text' },
  ];

  const tierOptions = [
    { value: 'all', label: 'All tiers' },
    ...tiers.map((tier) => ({ value: tier.id, label: tier.name })),
  ];

  const dateRanges = [
    { value: 'all', label: 'All time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
  ];

  // If parent is handling filtering via API, don't filter locally
  const filteredPosts = onFilterChange
    ? posts
    : posts.filter((post) => {
        const matchesSearch = post.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesType =
          filters.type === 'all' || post.contentType === filters.type;
        const matchesTier =
          filters.tier === 'all' || post.tierIds.includes(filters.tier);
        return matchesSearch && matchesType && matchesTier;
      });

  return (
    <section>
      <h2 className='mb-4 text-2xl font-bold'>Recent posts</h2>

      {/* Filters Bar */}
      <div className='mb-6 flex flex-wrap gap-3'>
        {/* Post Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              {postTypes.find((t) => t.value === filters.type)?.label}
              <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {postTypes.map((type) => (
              <DropdownMenuItem
                key={type.value}
                onClick={() => updateFilters({ type: type.value as any })}
              >
                {type.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tier Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              {tierOptions.find((t) => t.value === filters.tier)?.label}
              <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {tierOptions.map((tier) => (
              <DropdownMenuItem
                key={tier.value}
                onClick={() => updateFilters({ tier: tier.value })}
              >
                {tier.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              {dateRanges.find((d) => d.value === filters.dateRange)?.label}
              <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {dateRanges.map((range) => (
              <DropdownMenuItem
                key={range.value}
                onClick={() => updateFilters({ dateRange: range.value as any })}
              >
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Icon Button */}
        <Button variant='outline' size='sm'>
          <Filter className='h-4 w-4' />
        </Button>

        {/* Search */}
        <div className='relative ml-auto w-full sm:w-64'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search posts'
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className='pl-10'
          />
        </div>
      </div>

      {/* Posts Grid */}
      {filteredPosts.length > 0 ? (
        <>
          <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                href={`/content/${post.id}`}
                className='block'
              >
                <div className='group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg'>
                  {/* Post Image */}
                  {post.thumbnailUrl && (
                    <div className='relative aspect-video w-full overflow-hidden bg-muted'>
                      <img
                        src={post.thumbnailUrl}
                        alt={post.title}
                        className='absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105'
                      />
                    </div>
                  )}

                  {/* Post Info */}
                  <div className='p-4'>
                    <h3 className='mb-2 line-clamp-2 font-semibold'>
                      {post.title}
                    </h3>
                    <p className='mb-3 line-clamp-2 text-sm text-muted-foreground'>
                      {post.description}
                    </p>

                    {/* Post Stats */}
                    <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                      <span>{post.viewCount} views</span>
                      <span>{post.likeCount} likes</span>
                      <span className='ml-auto'>
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Load More Button */}
          {onLoadMore && (
            <div className='mt-8 flex justify-center'>
              <Button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                variant='outline'
                size='lg'
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className='rounded-lg border border-border bg-card p-12 text-center'>
          <p className='text-muted-foreground'>
            {searchQuery || filters.type !== 'all' || filters.tier !== 'all'
              ? 'No posts found matching your filters'
              : 'No posts yet. Create your first post to get started!'}
          </p>
        </div>
      )}
    </section>
  );
}
