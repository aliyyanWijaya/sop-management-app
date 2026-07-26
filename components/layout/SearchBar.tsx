"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Navigates to the SOP list with a `q` query param on submit. The SOP
// list page needs a small follow-up change to read `searchParams.q` and
// filter by title/document_number for this to actually filter results —
// this component only owns the input UI and the navigation.
export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/sop?q=${encodeURIComponent(trimmed)}` : "/sop");
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search SOP or document..."
        className="h-9 pl-8"
      />
    </form>
  );
}
