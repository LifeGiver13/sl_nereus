import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: { from: string; to: string }
  onChange?: (range: { from: string; to: string }) => void
  placeholder?: string
  className?: string
  startLabel?: string
  endLabel?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  startLabel = "Start Date",
  endLabel = "End Date"
}: DateRangePickerProps) {

  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (value?.from && value?.to) {
      return {
        from: new Date(value.from),
        to: new Date(value.to)
      }
    }
    return undefined
  })

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate)

    if (onChange) {
      onChange({
        from: newDate?.from
          ? format(newDate.from, "yyyy-MM-dd")
          : "",
        to: newDate?.to
          ? format(newDate.to, "yyyy-MM-dd")
          : "",
      })
    }

    // Close only when range complete
    if (newDate?.from && newDate?.to) {
      setOpen(false)
    }
  }
  React.useEffect(() => {
    if (value?.from && value?.to) {
      setDate({
        from: new Date(value.from),
        to: new Date(value.to)
      })
    } else if (!value?.from && !value?.to) {
      setDate(undefined)
    }
  }, [value])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {startLabel}: {format(date.from, "MMM dd, y")} - {endLabel}: {format(date.to, "MMM dd, y")}
                </>
              ) : (
                `${startLabel}: ${format(date.from, "MMM dd, y")}`
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}