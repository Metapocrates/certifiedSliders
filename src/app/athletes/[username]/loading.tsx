export default function Loading() {
  return (
    <div className="container py-10">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="h-6 w-96 bg-gray-200 rounded" />
        <div className="h-40 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
}
