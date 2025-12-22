// src/shared/ui/kit/DatePicker/DatePicker.tsx
import React, { useState, useRef, useEffect } from 'react'
import './DatePicker.css'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  className?: string
  placeholder?: string
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Выберите дату',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(value)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedDate(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const formatDate = (date?: Date): string => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    onChange(date)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedDate(undefined)
    onChange(undefined)
  }

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const generateCalendar = () => {
    const now = new Date()
    const currentDate = selectedDate || now
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = new Date(year, month, 1).getDay()
    
    const days = []
    
    // Пустые ячейки для начала месяца
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push(date)
    }
    
    return days
  }

  const calendarDays = generateCalendar()
  const now = new Date()
  const currentDate = selectedDate || now

  return (
    <div className={`date-picker ${className}`} ref={pickerRef}>
      <div 
        className="date-picker-input"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedDate ? (
          <span className="selected-date">{formatDate(selectedDate)}</span>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        {selectedDate && (
          <button 
            type="button"
            className="clear-button"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="date-picker-dropdown">
          <div className="date-picker-header">
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setMonth(newDate.getMonth() - 1)
                setSelectedDate(newDate)
              }}
            >
              ←
            </button>
            
            <div className="current-month">
              {currentDate.toLocaleDateString('ru-RU', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
            
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                const newDate = new Date(currentDate)
                newDate.setMonth(newDate.getMonth() + 1)
                setSelectedDate(newDate)
              }}
            >
              →
            </button>
          </div>
          
          <div className="date-picker-grid">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
            
            {calendarDays.map((date, index) => (
              <button
                key={index}
                type="button"
                className={`day-cell ${date ? '' : 'empty'} ${
                  date && date.toDateString() === (selectedDate?.toDateString() || '') 
                    ? 'selected' 
                    : ''
                } ${
                  date && date.toDateString() === now.toDateString() 
                    ? 'today' 
                    : ''
                }`}
                onClick={() => date && handleDateSelect(date)}
                disabled={!date}
              >
                {date ? date.getDate() : ''}
              </button>
            ))}
          </div>
          
          <div className="date-picker-actions">
            <button
              type="button"
              className="today-button"
              onClick={() => handleDateSelect(now)}
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  )
}