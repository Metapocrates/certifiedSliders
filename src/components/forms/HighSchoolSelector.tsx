"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  defaultSchool?: string | null;
  defaultState?: string | null;
  schoolError?: string;
  stateError?: string;
};

type Suggestion = {
  school_name: string;
  city: string | null;
  state: string;
};

const STATES = [
  { code: "", name: "Select state" },
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export function HighSchoolSelector({
  defaultSchool,
  defaultState,
  schoolError,
  stateError,
}: Props) {
  const [selectedState, setSelectedState] = useState(
    () => (defaultState ?? "").toUpperCase()
  );
  const [schoolInput, setSchoolInput] = useState(defaultSchool ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stateOptions = useMemo(() => STATES, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (!selectedState || schoolInput.trim().length < 2) {
      setSuggestions([]);
      setLookupError(null);
      setLoading(false);
      return;
    }

    if (manualEntry) {
      setSuggestions([]);
      setLookupError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(
          `/api/high-schools?state=${encodeURIComponent(
            selectedState
          )}&q=${encodeURIComponent(schoolInput.trim())}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          const text = (await response.text()) || "Lookup failed.";
          setLookupError(text);
          setSuggestions([]);
          return;
        }
        const payload = (await response.json()) as {
          data?: Suggestion[];
          error?: string;
        };
        if (payload.error) {
          setLookupError(payload.error);
          setSuggestions([]);
        } else {
          setLookupError(null);
          setSuggestions(payload.data ?? []);
        }
      } catch (error: unknown) {
        if ((error as DOMException)?.name === "AbortError") return;
        console.error("High school lookup failed:", error);
        setLookupError("Could not reach the high school directory.");
        setSuggestions([]);
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [selectedState, schoolInput, manualEntry]);

  const clearSuggestions = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();
    setSuggestions([]);
    setLookupError(null);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">State</label>
        <select
          name="school_state"
          value={selectedState}
          onChange={(event) => {
            setSelectedState(event.target.value);
            clearSuggestions();
            setManualEntry(false);
          }}
        className="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
      >
          {stateOptions.map((option) => (
            <option key={option.code || "blank"} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        {stateError ? (
          <p className="mt-1 text-xs text-red-600">{stateError}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Choose your school’s state first.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">High school</label>
        <input
          name="school_name"
          value={schoolInput}
          onChange={(event) => setSchoolInput(event.target.value)}
        className="w-full rounded border px-3 py-2 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-100"
          placeholder={
            !selectedState
              ? "Select state first"
              : manualEntry
              ? "Type your school name…"
              : "Start typing your school…"
          }
          disabled={!selectedState}
        />
        {schoolError ? (
          <p className="mt-1 text-xs text-red-600">{schoolError}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            {manualEntry
              ? "Manual entry enabled. Suggestions are hidden until you pick a school."
              : "Pick a school from the list or choose “Other / Not Listed.”"}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Searching schools…</p>
      ) : null}
      {!loading && lookupError ? (
        <p className="text-xs text-red-600">{lookupError}</p>
      ) : null}

      {!loading &&
      !lookupError &&
      selectedState &&
      schoolInput.trim().length >= 2 &&
      suggestions.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-800">
          {suggestions.map((item) => (
            <li key={`${item.state}-${item.school_name}-${item.city ?? ""}`}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left transition hover:bg-gray-200 dark:hover:bg-slate-700"
                onMouseDown={(event) => {
                  event.preventDefault();
                  setSchoolInput(item.school_name);
                  setManualEntry(false);
                  clearSuggestions();
                }}
              >
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.school_name}
                </span>
                {item.city ? (
                  <span className="mt-0.5 text-[0.7rem] text-gray-500 dark:text-gray-300">
                    {item.city}, {item.state}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-left text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-900 dark:border-slate-600 dark:text-gray-300 dark:hover:border-slate-500 dark:hover:text-gray-100"
        onMouseDown={(event) => {
          event.preventDefault();
          setManualEntry(true);
          setSchoolInput("");
          clearSuggestions();
        }}
      >
        Other / Not Listed
      </button>
    </div>
  );
}
