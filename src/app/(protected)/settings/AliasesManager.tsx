"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Alias = {
  id: string;
  alias: string;
  type: "nickname" | "alt_legal" | "maiden" | "other";
  is_public: boolean;
  created_at: string;
};

type Props = {
  initialAliases: Alias[];
};

const ALIAS_TYPE_LABELS: Record<Alias["type"], string> = {
  nickname: "Nickname",
  alt_legal: "Alternate Legal Name",
  maiden: "Maiden Name",
  other: "Other",
};

export default function AliasesManager({ initialAliases }: Props) {
  const router = useRouter();
  const [aliases, setAliases] = useState(initialAliases);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Add alias form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [newType, setNewType] = useState<Alias["type"]>("nickname");
  const [newIsPublic, setNewIsPublic] = useState(true);

  function handleAddAlias() {
    if (!newAlias.trim()) {
      setError("Alias cannot be empty");
      return;
    }

    if (newAlias.trim().length < 2 || newAlias.trim().length > 100) {
      setError("Alias must be between 2 and 100 characters");
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/profile/aliases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alias: newAlias.trim(),
            type: newType,
            is_public: newIsPublic,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error ?? "Failed to add alias");
          return;
        }

        setAliases((prev) => [data.alias, ...prev]);
        setNewAlias("");
        setNewType("nickname");
        setNewIsPublic(true);
        setShowAddForm(false);
        setMessage("Alias added successfully!");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error");
      }
    });
  }

  function handleDeleteAlias(id: string) {
    if (!confirm("Are you sure you want to delete this alias?")) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/profile/aliases/${id}`, {
          method: "DELETE",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data?.error ?? "Failed to delete alias");
          return;
        }

        setAliases((prev) => prev.filter((a) => a.id !== id));
        setMessage("Alias deleted successfully!");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error");
      }
    });
  }

  function handleToggleVisibility(id: string, currentVisibility: boolean) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/profile/aliases/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_public: !currentVisibility }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error ?? "Failed to update alias");
          return;
        }

        setAliases((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_public: data.alias.is_public } : a))
        );
        setMessage("Visibility updated!");
        router.refresh();
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {message && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Aliases list */}
      {aliases.length > 0 ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Alias</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Visibility</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {aliases.map((alias) => (
                <tr key={alias.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{alias.alias}</td>
                  <td className="px-4 py-3 text-gray-600">{ALIAS_TYPE_LABELS[alias.type]}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(alias.id, alias.is_public)}
                      disabled={pending}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        alias.is_public
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {alias.is_public ? "Public" : "Private"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteAlias(alias.id)}
                      disabled={pending}
                      className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">No aliases yet. Add one below to make your profile easier to find.</p>
        </div>
      )}

      {/* Add alias form */}
      {showAddForm ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
          <h3 className="font-semibold">Add New Alias</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alias Name
            </label>
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="e.g., Johnny, J. Smith"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-scarlet"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as Alias["type"])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-scarlet"
            >
              {Object.entries(ALIAS_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-public"
              checked={newIsPublic}
              onChange={(e) => setNewIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-scarlet focus:ring-scarlet"
            />
            <label htmlFor="is-public" className="text-sm text-gray-700">
              Make this alias public (visible in search)
            </label>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleAddAlias}
              disabled={pending}
              className="rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white hover:bg-scarlet/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "Adding..." : "Add Alias"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewAlias("");
                setNewType("nickname");
                setNewIsPublic(true);
                setError(null);
              }}
              disabled={pending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          + Add Alias
        </button>
      )}
    </div>
  );
}
