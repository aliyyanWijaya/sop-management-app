export default async function SopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div>
      <h1 className="text-xl font-semibold">Detail SOP</h1>
      <p className="mt-2 text-sm text-gray-500">
        Halaman ini masih placeholder untuk SOP id: {id}
      </p>
    </div>
  )
}
