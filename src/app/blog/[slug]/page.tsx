export default async function BlogPostPlaceholder({ params }: { params: { slug: string } }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Post: {params.slug}</h1>
      <p className="text-gray-600 mt-2">Detailed post rendering coming next.</p>
    </div>
  );
}
