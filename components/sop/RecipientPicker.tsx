"use client";

import { useMemo, useState } from "react";

type UserOption = {
  id: string;
  name: string;
  email: string;
  department_id: string | null;
};
type DepartmentOption = { id: string; name: string };

export function RecipientPicker({
  name,
  users,
  departments,
  alreadyAssignedIds = [],
}: {
  name: string;
  users: UserOption[];
  departments: DepartmentOption[];
  alreadyAssignedIds?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const alreadySet = useMemo(
    () => new Set(alreadyAssignedIds),
    [alreadyAssignedIds],
  );

  const usersByDept = useMemo(() => {
    const map = new Map<string, UserOption[]>();
    for (const d of departments) map.set(d.id, []);
    for (const u of users) {
      const key = u.department_id ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return map;
  }, [users, departments]);

  function toggleUser(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleDepartment(deptUsers: UserOption[]) {
    const eligible = deptUsers.filter((u) => !alreadySet.has(u.id));
    const allSelected =
      eligible.length > 0 && eligible.every((u) => selected.has(u.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of eligible)
        allSelected ? next.delete(u.id) : next.add(u.id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {departments.map((d) => {
        const deptUsers = usersByDept.get(d.id) ?? [];
        if (deptUsers.length === 0) return null;
        const eligible = deptUsers.filter((u) => !alreadySet.has(u.id));
        const allSelected =
          eligible.length > 0 && eligible.every((u) => selected.has(u.id));

        return (
          <div key={d.id} className="rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => toggleDepartment(deptUsers)}
                className="h-4 w-4 cursor-pointer"
              />
              {d.name}{" "}
              <span className="text-xs text-muted-foreground">
                ({deptUsers.length} orang)
              </span>
            </label>
            <div className="mt-2 ml-6 space-y-1">
              {deptUsers.map((u) => {
                const already = alreadySet.has(u.id);
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-2 text-sm ${already ? "text-muted-foreground" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={already || selected.has(u.id)}
                      disabled={already}
                      onChange={() => toggleUser(u.id)}
                      className="h-4 w-4 cursor-pointer"
                    />
                    {u.name}
                    {already && (
                      <span className="text-xs italic"> (sudah di-assign)</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <input type="hidden" name={name} value={JSON.stringify([...selected])} />
    </div>
  );
}
