import AthleteSearch from "./AthleteSearch";

export default function AthletesIndex() {
  return (
    <main className="container mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-app">Find Athletes</h1>
        <p className="mt-2 text-sm text-muted">
          Search for high school track and field athletes by name, class year, or gender.
        </p>
      </div>

      <AthleteSearch />
    </main>
  );
}
