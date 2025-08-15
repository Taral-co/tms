import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '../../lib/utils'

export interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number // Number of items to render outside viewport
  onScroll?: (scrollTop: number) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  estimatedItemHeight?: number // For dynamic heights
}

/**
 * High-performance virtualized list component for handling large datasets (5k+ items)
 * 
 * Features:
 * - Only renders visible items + overscan buffer
 * - Smooth scrolling with scroll position tracking
 * - Infinite loading support
 * - Dynamic height estimation
 * - Accessibility support with proper ARIA attributes
 */
export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  onLoadMore,
  hasMore = false,
  loading = false,
  loadingComponent,
  emptyComponent,
  estimatedItemHeight
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
//   const [isScrolling, setIsScrolling] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loadMoreThreshold = 200 // px from bottom to trigger load more

  // Calculate which items should be visible
  const visibleRange = useMemo(() => {
    const itemHeightToUse = estimatedItemHeight || itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeightToUse) - overscan)
    const visibleItemCount = Math.ceil(containerHeight / itemHeightToUse)
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItemCount + overscan * 2
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, containerHeight, itemHeight, estimatedItemHeight, overscan, items.length])

  // Calculate total height for scrollbar
  const totalHeight = useMemo(() => {
    return items.length * (estimatedItemHeight || itemHeight)
  }, [items.length, itemHeight, estimatedItemHeight])

  // Visible items to render
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange.startIndex, visibleRange.endIndex])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    // setIsScrolling(true)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
    //   setIsScrolling(false)
    }, 150)
    
    // Call external scroll handler
    onScroll?.(newScrollTop)
    
    // Check if we need to load more
    if (hasMore && !loading && onLoadMore) {
      const scrollBottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight
      if (scrollBottom < loadMoreThreshold) {
        onLoadMore()
      }
    }
  }, [onScroll, onLoadMore, hasMore, loading])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Scroll to top when items change (e.g., new filter applied)
  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0
      setScrollTop(0)
    }
  }, [])

  // Scroll to specific item
  const scrollToItem = useCallback((index: number) => {
    if (containerRef.current) {
      const itemHeightToUse = estimatedItemHeight || itemHeight
      const scrollPosition = index * itemHeightToUse
      containerRef.current.scrollTop = scrollPosition
      setScrollTop(scrollPosition)
    }
  }, [itemHeight, estimatedItemHeight])

  // Expose scroll methods
  useEffect(() => {
    if (containerRef.current) {
      // Add methods to ref for external access  
      const container = containerRef.current as any
      container.scrollToTop = scrollToTop
      container.scrollToItem = scrollToItem
    }
  }, [scrollToTop, scrollToItem])

  // Handle empty state
  if (items.length === 0 && !loading) {
    return (
      <div 
        className={cn("flex items-center justify-center", className)}
        style={{ height: containerHeight }}
      >
        {emptyComponent || <div className="text-muted-foreground">No items found</div>}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={items.length}
      aria-label="Virtualized list"
    >
      {/* Total height container for proper scrollbar */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            transform: `translateY(${visibleRange.startIndex * (estimatedItemHeight || itemHeight)}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.startIndex + index
            return (
              <div
                key={actualIndex}
                style={{ 
                  height: estimatedItemHeight || itemHeight,
                  overflow: 'hidden' 
                }}
                role="gridcell"
                aria-rowindex={actualIndex + 1}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
          
          {/* Loading indicator */}
          {loading && hasMore && (
            <div
              style={{ height: 60 }}
              className="flex items-center justify-center border-t"
            >
              {loadingComponent || (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span>Loading more...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook for managing virtualized list state
export function useVirtualizedList<T>() {
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  
  const loadMore = useCallback(async (
    loadFn: (page: number) => Promise<{ items: T[], hasMore: boolean }>
  ) => {
    if (loading) return
    
    setLoading(true)
    try {
      const result = await loadFn(page + 1)
      setPage(prev => prev + 1)
      setHasMore(result.hasMore)
      return result
    } catch (error) {
      console.error('Failed to load more items:', error)
      return { items: [], hasMore: false }
    } finally {
      setLoading(false)
    }
  }, [loading, page])
  
  const reset = useCallback(() => {
    setLoading(false)
    setHasMore(false)
    setPage(1)
  }, [])
  
  return {
    loading,
    hasMore,
    page,
    loadMore,
    reset,
    setHasMore
  }
}

export default VirtualizedList
