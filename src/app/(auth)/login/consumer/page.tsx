import { redirect } from 'next/navigation'

type SearchParamsValue = string | string[] | undefined

function buildQueryString(searchParams: Record<string, SearchParamsValue>) {
  const query = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) query.append(key, item)
      })
      return
    }

    if (value) {
      query.set(key, value)
    }
  })

  return query.toString()
}

export default async function ConsumerLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, SearchParamsValue>>
}) {
  const resolvedSearchParams = await searchParams
  const queryString = buildQueryString(resolvedSearchParams)

  redirect(`/login${queryString ? `?${queryString}` : ''}`)
}
