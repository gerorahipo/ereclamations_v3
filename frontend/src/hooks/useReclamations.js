import { useState, useEffect, useCallback } from 'react'
import { reclamationsApi } from '../api/index.js'

export function useReclamations(initialFilters = {}) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filters, setFilters] = useState(initialFilters)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await reclamationsApi.list(filters)
      setData(res?.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetch() }, [fetch])

  const updateFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const resetFilters = () => setFilters(initialFilters)

  return { data, loading, error, filters, updateFilter, resetFilters, refresh: fetch }
}
