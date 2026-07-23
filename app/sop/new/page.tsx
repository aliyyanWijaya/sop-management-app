import { createClient } from "@/lib/supabase/server";
import { createSopDraft } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Step 2a: simplest possible form — just title and category.
// The document number is generated automatically (see app/sop/new/actions.ts).
export default async function NewSopPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // sop_categories is readable by any logged-in user (see RLS policy
  // "categories_select_all")
  const { data: categories } = await supabase
    .from("sop_categories")
    .select("id, name")
    .order("name");

  return (
    <div className="max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New SOP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </p>
          )}

          {(!categories || categories.length === 0) && (
            <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
              No SOP categories yet. Ask a Document Controller to add one under
              Master Data before creating a new SOP.
            </p>
          )}

          <Separator />

          <form action={createSopDraft} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                SOP Title
              </label>
              <Input
                name="title"
                type="text"
                placeholder="e.g. Raw Material Inspection Procedure"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              {/* `name` on Select renders a hidden bubbled input synced to the
                  selected value, so it submits normally with the surrounding
                  <form action={...}> server action — no client state needed. */}
              <Select name="category_id" required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                The document number is generated automatically based on the
                category&apos;s department (e.g. SOP-QA-0001).
              </p>
            </div>

            <Button
              type="submit"
              disabled={!categories || categories.length === 0}
              className="mt-2 w-fit cursor-pointer transition-transform active:scale-95"
            >
              Create Draft
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
