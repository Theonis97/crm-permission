interface StorePageHeaderProps {
  title: string
  description: string
}

export function StorePageHeader({ title, description }: StorePageHeaderProps) {
  return (
    <div className="border-b bg-white px-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}