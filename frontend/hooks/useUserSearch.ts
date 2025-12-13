import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export function useUserSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/collaborators?search=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.collaborators || []);
      } else {
        console.error("Failed to search users");
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isLoading,
    handleSearch,
    clearSearch,
  };
}
