"use client";

import { useState, useEffect } from "react";
import { getNotesForAthlete, addNote, updateNote, deleteNote } from "@/actions/coach-notes";

type Note = {
  id: string;
  note: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  athleteProfileId: string;
  athleteName: string;
  hasNotes?: boolean;
};

export default function NotesButton({ athleteProfileId, athleteName, hasNotes = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen]);

  async function loadNotes() {
    setIsLoading(true);
    const result = await getNotesForAthlete(athleteProfileId);
    if (result.success) {
      setNotes(result.notes);
    }
    setIsLoading(false);
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setIsLoading(true);
    const result = await addNote(athleteProfileId, newNote);
    if (result.success && result.note) {
      setNotes([result.note, ...notes]);
      setNewNote("");
    } else {
      alert(result.error || "Failed to add note");
    }
    setIsLoading(false);
  }

  async function handleUpdateNote(noteId: string) {
    if (!editText.trim()) return;
    setIsLoading(true);
    const result = await updateNote(noteId, editText);
    if (result.success) {
      setNotes(notes.map((n) => (n.id === noteId ? { ...n, note: editText } : n)));
      setEditingId(null);
      setEditText("");
    } else {
      alert(result.error || "Failed to update note");
    }
    setIsLoading(false);
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    setIsLoading(true);
    const result = await deleteNote(noteId);
    if (result.success) {
      setNotes(notes.filter((n) => n.id !== noteId));
    } else {
      alert(result.error || "Failed to delete note");
    }
    setIsLoading(false);
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-1.5 rounded transition ${
          hasNotes || notes.length > 0
            ? "text-blue-600 hover:text-blue-700"
            : "text-gray-400 hover:text-blue-500"
        }`}
        title={hasNotes || notes.length > 0 ? "View notes" : "Add note"}
      >
        <svg
          className="h-5 w-5"
          fill={hasNotes || notes.length > 0 ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Notes: {athleteName}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add Note Form */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a private note..."
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
                rows={3}
              />
              <button
                onClick={handleAddNote}
                disabled={isLoading || !newNote.trim()}
                className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add Note"}
              </button>
            </div>

            {/* Notes List */}
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {isLoading && notes.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  No notes yet. Add your first note above.
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {editingId === note.id ? (
                      <div>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full rounded border p-2 text-sm dark:bg-gray-700"
                          rows={3}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleUpdateNote(note.id)}
                            disabled={isLoading}
                            className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditText("");
                            }}
                            className="rounded bg-gray-200 px-3 py-1 text-xs hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm">{note.note}</p>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(note.id);
                                setEditText(note.note);
                              }}
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 border-t pt-4 text-xs text-gray-500">
              These notes are private and only visible to you.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
