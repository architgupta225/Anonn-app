import { ChevronDown } from "lucide-react";

interface FeedControlsProps {
  sortBy: 'hot' | 'new';
  timeFilter: 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';
  onSortChange: (sort: 'hot' | 'new') => void;
  onTimeFilterChange: (filter: 'all' | 'hour' | 'day' | 'week' | 'month' | 'year') => void;
}

export default function FeedControls({
  sortBy,
  timeFilter,
  onSortChange,
  onTimeFilterChange,
}: FeedControlsProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {/* Left Side - NEW and HOT tabs */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onSortChange("new")}
            className={`font-medium text-sm uppercase tracking-wide transition-all ${
              sortBy === "new"
                ? "px-6 py-2 rounded-full bg-white text-gray-900"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            NEW
          </button>
          <button
            onClick={() => onSortChange("hot")}
            className={`font-medium text-sm uppercase tracking-wide transition-all ${
              sortBy === "hot"
                ? "px-6 py-2 rounded-full bg-white text-gray-900"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            HOT
          </button>
        </div>

        {/* Right Side - Time Filter Dropdown */}
        <div className="relative">
          <select
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value as 'all' | 'hour' | 'day' | 'week' | 'month' | 'year')}
            className="pl-4 pr-10 py-2 bg-transparent text-gray-500 text-sm font-medium uppercase tracking-wide border-none focus:outline-none appearance-none cursor-pointer hover:text-gray-300"
          >
            <option value="all" className="bg-[#1a1a1a]">
              ALL TIME
            </option>
            <option value="hour" className="bg-[#1a1a1a]">
              PAST HOUR
            </option>
            <option value="day" className="bg-[#1a1a1a]">
              PAST DAY
            </option>
            <option value="week" className="bg-[#1a1a1a]">
              THIS WEEK
            </option>
            <option value="month" className="bg-[#1a1a1a]">
              PAST MONTH
            </option>
            <option value="year" className="bg-[#1a1a1a]">
              PAST YEAR
            </option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}