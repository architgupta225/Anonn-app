import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useState } from "react"; // 1. Import useState

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ 
  onSearch, 
  placeholder = "Blow the whistle ....." 
}: SearchBarProps) {
  // 2. Add local state to control the input's value
  const [query, setQuery] = useState("");

  // 3. This handles form submission (like pressing Enter)
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // The search has already happened via onChange,
    // but this prevents the page from reloading
    // and confirms the search.
    onSearch?.(query);
  };

  // 4. This new handler updates the search query on every keystroke
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery); // Update the local input value
    onSearch?.(newQuery); // Pass the new query up to Home.tsx immediately
  };

  return (
    <div className="mb-4">
      {/* 5. Use the new handleSubmit */}
      <form onSubmit={handleSubmit} className="flex border border-gray-700 overflow-hidden">
        <Input
          type="text"
          // We no longer need the 'name' attribute
          placeholder={placeholder}
          // 6. Control the input's value with our state
          value={query}
          // 7. Call handleChange on every keystroke
          onChange={handleChange}
          className="flex-1 h-10 md:h-16 bg-[#1a1a1a] border-0 text-white placeholder:text-gray-500 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-6"
        />
        <Button 
          type="submit"
          className="h-10 md:h-16 bg-[#505050] hover:bg-[#606060] text-white font-medium px-4 md:px-8 flex items-center gap-2 text-sm uppercase tracking-wider rounded-none border-0"
        >
          <Search className="h-5 w-5" />
          SEARCH
        </Button>
      </form>
    </div>
  );
}