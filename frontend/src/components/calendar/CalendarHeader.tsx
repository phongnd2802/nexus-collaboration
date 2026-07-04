import { useRef, useCallback, useLayoutEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ChevronLeft, ChevronRight, Calendar, Plus, Search, Filter, BarChart3, X } from 'lucide-react'
import type { CalendarView } from '../../types/calendar'
import { useCalendarStore } from '../../stores/calendarStore'
import { formatCalendarViewTitle } from '../../lib/calendar-utils'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'
import { format as formatDate } from 'date-fns'
import { toast } from 'sonner'

interface CalendarHeaderProps {
  onCreateEvent: () => void
  onShowFilters: () => void
  onShowAnalytics: () => void
  showAnalytics: boolean
}

export function CalendarHeader({
  onCreateEvent,
  onShowFilters,
  onShowAnalytics,
  showAnalytics
}: CalendarHeaderProps) {
  const intl = useIntl()
  const [compactActionButtons, setCompactActionButtons] = useState(false)
  const headerRef = useRef<HTMLDivElement | null>(null)
  const leftSectionRef = useRef<HTMLDivElement | null>(null)
  const rightSectionRef = useRef<HTMLDivElement | null>(null)
  const rightMeasureRef = useRef<HTMLDivElement | null>(null)
  const compactActionButtonsRef = useRef(false)
  const measureRef = useRef<(() => void) | null>(null)

  const {
    currentView,
    currentDate,
    setCurrentView,
    navigatePrevious,
    navigateNext,
    navigateToToday,
    updateFilters,
    resetFilters,
    filters
  } = useCalendarStore()

  const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
    { value: 'day', label: intl.formatMessage({ id: 'modules.calendar.header.viewDay' }) },
    { value: 'week', label: intl.formatMessage({ id: 'modules.calendar.header.viewWeek' }) },
    { value: 'month', label: intl.formatMessage({ id: 'modules.calendar.header.viewMonth' }) },
    { value: 'year', label: intl.formatMessage({ id: 'modules.calendar.header.viewYear' }) },
    { value: 'agenda', label: intl.formatMessage({ id: 'modules.calendar.header.viewAgenda' }) },
    { value: 'timeline', label: intl.formatMessage({ id: 'modules.calendar.header.viewTimeline' }) },
  ]
  const activeFilterCount = getActiveFilterCount()

  useLayoutEffect(() => {
    compactActionButtonsRef.current = compactActionButtons
  }, [compactActionButtons])

  useLayoutEffect(() => {
    const measure = () => {
      const headerEl = headerRef.current
      const leftEl = leftSectionRef.current
      const rightEl = rightSectionRef.current
      const rightMeasureEl = rightMeasureRef.current

      if (!headerEl || !leftEl || !rightEl) return

      // Available width only inside the middle calendar pane:
      // from the right edge of left controls (time/calendar area) to the left edge of right sidebar (progress area).
      const availableWidth = headerEl.clientWidth - leftEl.offsetWidth - 20
      // Always measure with full labels to avoid flicker when current mode is compact.
      const requiredFullWidth = rightMeasureEl?.scrollWidth ?? rightEl.scrollWidth
      const expandBuffer = 96

      let nextCompactActions = compactActionButtonsRef.current
      if (!compactActionButtonsRef.current && requiredFullWidth > availableWidth) {
        nextCompactActions = true
      } else if (compactActionButtonsRef.current && requiredFullWidth + expandBuffer < availableWidth) {
        nextCompactActions = false
      }

      if (nextCompactActions !== compactActionButtonsRef.current) {
        compactActionButtonsRef.current = nextCompactActions
        setCompactActionButtons(nextCompactActions)
      }
    }
    measureRef.current = measure

    let frameId = 0
    let burstTimer: number | null = null
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(measure)
    })
    const runMeasureBurst = () => {
      let ticks = 0
      if (burstTimer) window.clearInterval(burstTimer)
      burstTimer = window.setInterval(() => {
        measureRef.current?.()
        ticks += 1
        if (ticks >= 15 && burstTimer) {
          window.clearInterval(burstTimer)
          burstTimer = null
        }
      }, 24)
    }
    const onLayoutChanged = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(() => {
        measureRef.current?.()
        runMeasureBurst()
      })
    }

    if (headerRef.current) observer.observe(headerRef.current)
    if (leftSectionRef.current) observer.observe(leftSectionRef.current)
    if (rightSectionRef.current) observer.observe(rightSectionRef.current)
    if (headerRef.current?.parentElement) observer.observe(headerRef.current.parentElement)

    window.addEventListener('resize', measure)
    window.addEventListener('nexus:layout-changed', onLayoutChanged as EventListener)
    measure()

    return () => {
      cancelAnimationFrame(frameId)
      if (burstTimer) window.clearInterval(burstTimer)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('nexus:layout-changed', onLayoutChanged as EventListener)
    }
  }, [showAnalytics, currentView, intl.locale, activeFilterCount, filters.searchQuery])

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.categories.length > 0 ||
      filters.priorities?.length > 0 ||
      filters.searchQuery?.trim() ||
      filters.dateRange ||
      (filters.tags?.length || 0) > 0 ||
      (filters.attendees?.length || 0) > 0
    )
  }

  // Get active filter count for badge
  function getActiveFilterCount() {
    let count = 0
    if (filters.categories.length > 0) count++
    if (filters.priorities?.length > 0) count++
    if (filters.searchQuery?.trim()) count++
    if (filters.dateRange) count++
    if ((filters.tags?.length || 0) > 0) count++
    if ((filters.attendees?.length || 0) > 0) count++
    return count
  }

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    resetFilters()
    toast.success(intl.formatMessage({ id: 'modules.calendar.header.filtersClearedSuccess' }))
  }

  // Debounced search to avoid too many API calls
  const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const handleSearchChange = useCallback((value: string) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set new timer for 300ms delay
    debounceTimer.current = setTimeout(() => {
      updateFilters({ searchQuery: value })
    }, 300)
  }, [updateFilters])

  return (
    <div ref={headerRef} className="relative flex items-center justify-between p-2 sm:p-4 border-b border-border bg-background min-h-[60px] sm:min-h-[72px]">
      <div ref={leftSectionRef} className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink-0">
        {/* Navigation - Hidden in analytics mode */}
        {!showAnalytics && (
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateToToday}
              title={intl.formatMessage({ id: 'modules.calendar.header.today' })}
              aria-label={intl.formatMessage({ id: 'modules.calendar.header.today' })}
              className="px-2 sm:px-3 text-xs sm:text-sm"
            >
              {intl.formatMessage({ id: 'modules.calendar.header.today' })}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Current Date/Period */}
        {/* <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h1 className="text-sm sm:text-lg font-semibold truncate">
            {showAnalytics ? 'Calendar Analytics' : formatCalendarViewTitle(currentView, currentDate, intl.locale)}
          </h1>
        </div> */}
      </div>

      <div ref={rightSectionRef} className="flex items-center gap-1 sm:gap-2 flex-shrink-0 overflow-hidden">
        {/* Search */}
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'modules.calendar.header.searchPlaceholder' })}
            defaultValue={filters.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 w-32 2xl:w-48"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilters({ searchQuery: '' })}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* View Selector - Hidden in analytics mode */}
        {!showAnalytics && (
          <Select value={currentView} onValueChange={(value: CalendarView) => setCurrentView(value)}>
            <SelectTrigger className="w-20 sm:w-24 lg:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Actions */}
        <Button
          variant={showAnalytics ? "default" : "outline"}
          size="sm"
          onClick={onShowAnalytics}
          title={intl.formatMessage({ id: 'modules.calendar.header.analytics' })}
          aria-label={intl.formatMessage({ id: 'modules.calendar.header.analytics' })}
          className={cn(
            "flex items-center gap-2 flex-shrink-0",
            compactActionButtons && "h-8 w-8 p-0 justify-center",
            showAnalytics && "gradient-primary-active border-0"
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className={cn(compactActionButtons && "hidden")}>
            {intl.formatMessage({ id: 'modules.calendar.header.analytics' })}
          </span>
        </Button>

        <Button
          variant={hasActiveFilters() ? "default" : "outline"}
          size="sm"
          onClick={onShowFilters}
          title={intl.formatMessage({ id: 'modules.calendar.header.filters' })}
          aria-label={intl.formatMessage({ id: 'modules.calendar.header.filters' })}
          className={cn(
            "flex items-center gap-2 flex-shrink-0 relative",
            compactActionButtons && "h-8 w-8 p-0 justify-center",
            hasActiveFilters() && "bg-blue-500 hover:bg-blue-600 text-white border-0"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className={cn(compactActionButtons && "hidden")}>
            {intl.formatMessage({ id: 'modules.calendar.header.filters' })}
          </span>
          {hasActiveFilters() && (
            <div className="absolute -top-2 -right-2 h-6 w-6 bg-orange-500 text-white border-0 rounded-full flex items-center justify-center text-xs group">
              <span className="group-hover:hidden">{getActiveFilterCount()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClearAllFilters()
                }}
                className="hidden group-hover:flex h-full w-full p-0 hover:bg-red-600 rounded-full items-center justify-center"
                title={intl.formatMessage({ id: 'modules.calendar.header.clearAllFilters' })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Button>

        <Button
          onClick={onCreateEvent}
          title={intl.formatMessage({ id: 'modules.calendar.header.newEvent' })}
          aria-label={intl.formatMessage({ id: 'modules.calendar.header.newEvent' })}
          className={cn(
            "flex items-center gap-2 flex-shrink-0 btn-gradient-primary border-0",
            compactActionButtons && "h-8 w-8 p-0 justify-center"
          )}
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className={cn(compactActionButtons && "hidden")}>
            {intl.formatMessage({ id: 'modules.calendar.header.newEvent' })}
          </span>
        </Button>
      </div>

      <div
        ref={rightMeasureRef}
        aria-hidden="true"
        className="absolute pointer-events-none opacity-0 -z-10 h-0 overflow-hidden whitespace-nowrap"
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="relative hidden xl:block">
            <div className="pl-10 w-32 2xl:w-48 h-10 border border-border rounded-md" />
          </div>

          {!showAnalytics && (
            <div className="w-20 sm:w-24 lg:w-32 h-10 border border-border rounded-md" />
          )}

          <Button variant={showAnalytics ? "default" : "outline"} size="sm" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>{intl.formatMessage({ id: 'modules.calendar.header.analytics' })}</span>
          </Button>

          <Button variant={hasActiveFilters() ? "default" : "outline"} size="sm" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>{intl.formatMessage({ id: 'modules.calendar.header.filters' })}</span>
          </Button>

          <Button size="sm" className="flex items-center gap-2 btn-gradient-primary border-0">
            <Plus className="h-4 w-4" />
            <span>{intl.formatMessage({ id: 'modules.calendar.header.newEvent' })}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
