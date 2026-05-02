import type { GameEditionDto } from '@gettin-paid/shared'
import { labelPriceChartingConsole, POPULAR_PRICECHARTING_CONSOLE_IDS } from '@gettin-paid/shared'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { css } from 'styled-system/css'
import { Button, buttonVariants } from '#/components/ui/Button'
import { Card } from '#/components/ui/Card'
import { Badge } from '#/components/ui/Badge'
import { apiFetch } from '#/lib/api'

const popularSet = new Set(POPULAR_PRICECHARTING_CONSOLE_IDS)

const chipConsoleIds = POPULAR_PRICECHARTING_CONSOLE_IDS.slice(0, 10)

export const Route = createFileRoute('/inventory/')({
  component: InventoryList,
  validateSearch: (search: Record<string, unknown>) => {
    const c = search.console
    if (typeof c === 'string' && c.trim()) return { console: c.trim() }
    return {}
  },
})

function editionConsoleLabel(
  e: Pick<GameEditionDto, 'priceChartingConsoleId' | 'priceChartingConsoleName'>,
) {
  return (
    e.priceChartingConsoleName ?? labelPriceChartingConsole(e.priceChartingConsoleId)
  )
}

const pageClass = css({ p: '6' })

const pageHeaderClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  mb: '6',
  gap: '4',
})

const pageTitleClass = css({
  fontSize: '2xl',
  fontWeight: 'normal',
  color: 'foreground',
  margin: '0',
  letterSpacing: '-0.01em',
})

const filtersRowClass = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  mb: '6',
  flexWrap: 'wrap',
})

const filterLabelClass = css({
  fontSize: 'sm',
  color: 'foregroundMuted',
  mr: '1',
})

const filterChipBase = css({
  display: 'inline-flex',
  alignItems: 'center',
  px: '3',
  py: '1',
  borderRadius: 'full',
  fontSize: 'sm',
  borderWidth: '1px',
  borderStyle: 'solid',
  cursor: 'pointer',
  textDecoration: 'none',
  transition: 'background-color 120ms ease, border-color 120ms ease, color 120ms ease',
})

const filterChipActive = css({
  bg: 'navActive',
  borderColor: 'borderSubtle',
  color: 'foreground',
  fontWeight: 'medium',
})

const filterChipInactive = css({
  bg: 'transparent',
  borderColor: 'transparent',
  color: 'foregroundMuted',
  _hover: { bg: 'navHover', color: 'foreground', borderColor: 'border' },
})

const listClass = css({
  listStyle: 'none',
  padding: '0',
  margin: '0',
  display: 'flex',
  flexDir: 'column',
  gap: '2',
})

const editionLinkClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  p: '4',
  textDecoration: 'none',
  gap: '4',
  borderRadius: 'card',
  bg: 'surface',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  _hover: { borderColor: 'borderSubtle', bg: 'rgba(255,255,255,0.03)' },
})

const editionTitleClass = css({
  fontSize: 'base',
  fontWeight: 'medium',
  color: 'foreground',
  margin: '0 0 4px 0',
})

const editionMetaClass = css({
  fontSize: 'sm',
  color: 'foregroundMuted',
  margin: '0',
})

const arrowClass = css({
  fontSize: 'sm',
  color: 'foregroundMuted',
  flexShrink: '0',
})

const emptyClass = css({
  textAlign: 'center',
  py: '16',
  color: 'foregroundMuted',
})

const emptyTitleClass = css({
  fontSize: 'md',
  color: 'foreground',
  mb: '2',
})

const stateTextClass = css({
  color: 'foregroundMuted',
  fontSize: 'sm',
  py: '4',
})

const errorCardClass = css({
  bg: 'rgba(192,57,43,0.08)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgba(192,57,43,0.2)',
  borderRadius: 'card',
  p: '4',
  mb: '4',
})

const errorTitleClass = css({
  fontSize: 'base',
  fontWeight: 'semibold',
  color: 'danger',
  mb: '1',
})

const errorTextClass = css({
  fontSize: 'sm',
  color: 'foregroundMuted',
  mb: '3',
})

function InventoryList() {
  const { console: consoleFilter } = Route.useSearch()
  const platformsQuery = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiFetch<{ id: string; name: string }[]>('/platforms'),
    staleTime: 86_400_000,
  })
  const nameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of platformsQuery.data ?? []) {
      m.set(p.id, p.name)
    }
    return m
  }, [platformsQuery.data])

  function chipLabel(id: string) {
    return nameById.get(id) ?? labelPriceChartingConsole(id)
  }

  const moreConsoleOptions = useMemo(() => {
    const platforms = platformsQuery.data
    if (!platforms?.length) return [] as { id: string; label: string }[]
    const head = POPULAR_PRICECHARTING_CONSOLE_IDS.slice(10).map((id) => ({
      id,
      label: `${nameById.get(id) ?? labelPriceChartingConsole(id)} (${id})`,
    }))
    const tail = platforms
      .filter((c) => !popularSet.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        id: c.id,
        label: `${c.name} (${c.id})`,
      }))
    return [...head, ...tail]
  }, [platformsQuery.data, nameById])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['editions', consoleFilter ?? 'all'],
    queryFn: () => {
      const q = consoleFilter ? `?console=${encodeURIComponent(consoleFilter)}` : ''
      return apiFetch<GameEditionDto[]>(`/editions${q}`)
    },
  })

  return (
    <div className={pageClass}>
      <div className={pageHeaderClass}>
        <h1 className={pageTitleClass}>Inventory</h1>
        <Link to="/inventory/add" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          + New
        </Link>
      </div>

      <div className={filtersRowClass}>
        <span className={filterLabelClass}>Console:</span>
        <FilterChip label="All" to="/inventory" search={{}} active={!consoleFilter} />
        {chipConsoleIds.map((id) => (
          <FilterChip
            key={id}
            label={chipLabel(id)}
            to="/inventory"
            search={{ console: id }}
            active={consoleFilter === id}
          />
        ))}
        {moreConsoleOptions.length > 0 && (
          <details style={{ position: 'relative' }}>
            <summary
              className={`${filterChipBase} ${filterChipInactive}`}
              style={{ listStyle: 'none' }}
            >
              More…
            </summary>
            <Card
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 20,
                minWidth: '220px',
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              <div className={css({ p: '2', display: 'flex', flexDir: 'column', gap: '1' })}>
                {moreConsoleOptions.map((row) => (
                  <Link
                    key={row.id}
                    to="/inventory"
                    search={{ console: row.id }}
                    className={css({
                      display: 'block',
                      px: '3',
                      py: '2',
                      borderRadius: 'btn',
                      fontSize: 'sm',
                      color: 'foregroundMuted',
                      textDecoration: 'none',
                      _hover: { bg: 'navHover', color: 'foreground' },
                    })}
                  >
                    {row.label}
                  </Link>
                ))}
              </div>
            </Card>
          </details>
        )}
      </div>

      {isLoading && <p className={stateTextClass}>Loading editions…</p>}

      {isError && (
        <div className={errorCardClass}>
          <p className={errorTitleClass}>Could not load inventory.</p>
          <p className={errorTextClass}>
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void refetch()
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {data && data.length === 0 && !isLoading && (
        <div className={emptyClass}>
          <p className={emptyTitleClass}>No games yet.</p>
          <p className={css({ mb: '4', fontSize: 'sm' })}>
            Add a UPC to start tracking copies and market data.
          </p>
          <Link
            to="/inventory/add"
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Add a game
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className={listClass}>
          {data.map((e) => (
            <li key={e.id}>
              <Link
                to="/inventory/$editionId"
                params={{ editionId: e.id }}
                className={editionLinkClass}
              >
                <div>
                  <p className={editionTitleClass}>{e.title}</p>
                  <p className={editionMetaClass}>
                    {editionConsoleLabel(e)}
                    {' · UPC '}
                    {e.upc}
                    {e.copyCount != null && e.copyCount > 0
                      ? ` · ${e.copyCount} ${e.copyCount === 1 ? 'copy' : 'copies'}`
                      : ''}
                  </p>
                </div>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                  {e.copyCount != null && e.copyCount > 0 && (
                    <Badge variant="default">{e.copyCount}</Badge>
                  )}
                  <span className={arrowClass}>→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterChip({
  label,
  to,
  search,
  active,
}: {
  label: string
  to: '/inventory'
  search?: { console?: string }
  active: boolean
}) {
  return (
    <Link
      to={to}
      {...(search !== undefined ? { search } : {})}
      className={`${filterChipBase} ${active ? filterChipActive : filterChipInactive}`}
    >
      {label}
    </Link>
  )
}
