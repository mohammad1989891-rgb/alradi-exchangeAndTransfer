'use client';

import { useState, useCallback } from 'react';
import { Calendar as CalendarIcon, X, ArrowLeftRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, isAfter, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

export interface DateFilterValue {
  startDate?: Date;
  endDate?: Date;
  mode: 'single' | 'range';
}

interface DateFilterProps {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  className?: string;
}

// Helper function to check if date matches the filter
export function isDateInRange(
  dateToCheck: Date | string,
  filter: DateFilterValue
): boolean {
  if (!filter.startDate && !filter.endDate) {
    return true; // No filter applied
  }

  const date = new Date(dateToCheck);
  const dateStart = startOfDay(date);
  
  if (filter.mode === 'single' && filter.startDate) {
    // Single date mode - exact day match
    return isSameDay(date, filter.startDate);
  }
  
  if (filter.mode === 'range') {
    const start = filter.startDate ? startOfDay(filter.startDate) : null;
    const end = filter.endDate ? endOfDay(filter.endDate) : null;
    
    if (start && end) {
      return dateStart >= start && date <= end;
    } else if (start) {
      return dateStart >= start;
    } else if (end) {
      return date <= end;
    }
  }
  
  return true;
}

export function DateFilter({ value, onChange, className }: DateFilterProps) {
  const [selectingEnd, setSelectingEnd] = useState(false);
  
  const hasFilter = value.startDate || value.endDate;
  
  const handleModeChange = useCallback((mode: 'single' | 'range') => {
    setSelectingEnd(false);
    onChange({ ...value, mode, endDate: mode === 'single' ? undefined : value.endDate });
  }, [value, onChange]);
  
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (!date) {
      onChange({ mode: value.mode });
      setSelectingEnd(false);
      return;
    }
    
    if (value.mode === 'single') {
      // Single date mode
      onChange({ startDate: date, mode: 'single' });
    } else {
      // Range mode
      if (!value.startDate || (value.startDate && value.endDate)) {
        // Start new range selection
        onChange({ startDate: date, endDate: undefined, mode: 'range' });
        setSelectingEnd(true);
      } else if (selectingEnd) {
        // Selecting end date
        if (isAfter(value.startDate, date)) {
          // Start date is after end date - swap them
          onChange({ startDate: date, endDate: value.startDate, mode: 'range' });
        } else if (isSameDay(value.startDate, date)) {
          // Same day - set both to same date
          onChange({ startDate: value.startDate, endDate: date, mode: 'range' });
        } else {
          onChange({ startDate: value.startDate, endDate: date, mode: 'range' });
        }
        setSelectingEnd(false);
      } else {
        // Start new selection
        onChange({ startDate: date, endDate: undefined, mode: 'range' });
        setSelectingEnd(true);
      }
    }
  }, [value, onChange, selectingEnd]);
  
  const handleClear = useCallback(() => {
    onChange({ mode: 'single' });
    setSelectingEnd(false);
  }, [onChange]);
  
  const formatDisplayDate = useCallback((date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: ar });
  }, []);
  
  const getDisplayText = useCallback(() => {
    if (!value.startDate && !value.endDate) {
      return 'فلترة حسب التاريخ';
    }
    
    if (value.mode === 'single' && value.startDate) {
      return formatDisplayDate(value.startDate);
    }
    
    if (value.mode === 'range') {
      if (value.startDate && value.endDate) {
        if (isSameDay(value.startDate, value.endDate)) {
          return formatDisplayDate(value.startDate);
        }
        return `${formatDisplayDate(value.startDate)} → ${formatDisplayDate(value.endDate)}`;
      }
      if (value.startDate) {
        return `من ${formatDisplayDate(value.startDate)}`;
      }
    }
    
    return 'فلترة حسب التاريخ';
  }, [value, formatDisplayDate]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'gap-2 justify-start font-normal h-10 px-3',
            hasFilter && 'border-primary text-primary bg-primary/5',
            className
          )}
        >
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <span className="truncate flex-1 text-right">{getDisplayText()}</span>
          {hasFilter && (
            <X
              className="w-4 h-4 shrink-0 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Mode Selection */}
        <div className="flex border-b">
          <button
            onClick={() => handleModeChange('single')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              value.mode === 'single'
                ? 'text-primary bg-primary/5 border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            يوم محدد
          </button>
          <button
            onClick={() => handleModeChange('range')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
              value.mode === 'range'
                ? 'text-primary bg-primary/5 border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <ArrowLeftRight className="w-4 h-4" />
            نطاق زمني
          </button>
        </div>
        
        {/* Calendar */}
        <Calendar
          mode="single"
          selected={value.mode === 'single' ? value.startDate : (value.endDate || value.startDate)}
          onSelect={handleDateSelect}
          initialFocus
          numberOfMonths={1}
          modifiers={{
            range: value.mode === 'range' && value.startDate && value.endDate
              ? { from: value.startDate, to: value.endDate }
              : undefined,
          }}
          modifiersStyles={{
            range: {
              backgroundColor: 'hsl(var(--primary) / 0.1)',
            },
          }}
        />
        
        {/* Helper Text */}
        <div className="p-3 pt-0 text-xs text-muted-foreground text-center border-t">
          {value.mode === 'single' ? (
            'اختر التاريخ المطلوب'
          ) : selectingEnd && value.startDate && !value.endDate ? (
            <span className="text-primary font-medium">
              اختر تاريخ الانتهاء
            </span>
          ) : value.mode === 'range' && !value.startDate ? (
            'اختر تاريخ البداية'
          ) : value.mode === 'range' && value.startDate && value.endDate ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              تم تحديد النطاق الزمني
            </span>
          ) : null}
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 p-3 pt-0">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const today = new Date();
              if (value.mode === 'single') {
                onChange({ startDate: today, mode: 'single' });
              } else {
                onChange({ startDate: today, endDate: today, mode: 'range' });
                setSelectingEnd(false);
              }
            }}
          >
            اليوم
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(weekAgo.getDate() - 7);
              onChange({ startDate: weekAgo, endDate: today, mode: 'range' });
              setSelectingEnd(false);
            }}
          >
            آخر 7 أيام
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              onChange({ startDate: monthAgo, endDate: today, mode: 'range' });
              setSelectingEnd(false);
            }}
          >
            آخر شهر
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
