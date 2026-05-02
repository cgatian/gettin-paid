import {
  CopyClassification,
  findBestPriceChartingConsoleIdFromApiConsoleName,
  POPULAR_PRICECHARTING_CONSOLE_IDS,
  type EditionDetailDto,
  type PriceChartingProductSuggestionDto,
} from '@gettin-paid/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Camera } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { css } from 'styled-system/css'
import { Button, buttonVariants } from '#/components/ui/Button'
import { Card, cardBody, cardHeader } from '#/components/ui/Card'
import { Input, Select, Label } from '#/components/ui/Input'
import { apiFetch } from '#/lib/api'

export const Route = createFileRoute('/inventory/add')({ component: AddGame })

type CopyClassificationTag =
  (typeof CopyClassification)[keyof typeof CopyClassification]

const CLASSIFICATION_OPTIONS = Object.values(CopyClassification) as CopyClassificationTag[]

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

const pageClass = css({ p: '6', maxWidth: '600px' })

const backLinkClass = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  fontSize: 'sm',
  color: 'foregroundMuted',
  textDecoration: 'none',
  mb: '5',
  _hover: { color: 'foreground' },
  transition: 'color 120ms ease',
})

const pageTitleClass = css({
  fontSize: '2xl',
  fontWeight: 'normal',
  color: 'foreground',
  mb: '5',
  letterSpacing: '-0.01em',
})

const formBodyClass = css({
  display: 'flex',
  flexDir: 'column',
  gap: '4',
})

const fieldClass = css({ display: 'block', position: 'relative' })

const checkboxRowClass = css({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '2',
  cursor: 'pointer',
})

const checkboxLabelClass = css({
  fontSize: 'sm',
  color: 'foregroundMuted',
  lineHeight: '1.5',
  cursor: 'pointer',
})

const codeClass = css({
  fontFamily: 'mono',
  fontSize: 'xs',
  bg: 'background',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'sm',
  px: '1',
  color: 'accent',
})

const errorClass = css({
  bg: 'rgba(192,57,43,0.08)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'rgba(192,57,43,0.2)',
  borderRadius: 'btn',
  px: '3',
  py: '2',
  fontSize: 'sm',
  color: 'danger',
})

const actionRowClass = css({
  display: 'flex',
  gap: '3',
  pt: '2',
})

const suggestPanelClass = css({
  position: 'absolute',
  left: 0,
  right: 0,
  top: '100%',
  mt: '1',
  zIndex: 30,
  maxHeight: '240px',
  overflowY: 'auto',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border',
  borderRadius: 'btn',
  bg: 'card',
  boxShadow: 'md',
})

const suggestRowClass = css({
  w: '100%',
  textAlign: 'left',
  px: '3',
  py: '2',
  fontSize: 'sm',
  cursor: 'pointer',
  border: 'none',
  bg: 'transparent',
  color: 'foreground',
  _hover: { bg: 'navHover' },
})

function AddGame() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const platformsQuery = useQuery({
    queryKey: ['platforms'],
    queryFn: () => apiFetch<{ id: string; name: string }[]>('/platforms'),
    staleTime: 86_400_000,
  })
  const sortedConsoles = useMemo(
    () =>
      [...(platformsQuery.data ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [platformsQuery.data],
  )
  const [upc, setUpc] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  async function handleScan(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setIsScanning(true)
    setScanError(null)
    const url = URL.createObjectURL(file)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const result = await reader.decodeFromImageUrl(url)
      setUpc(result.getText())
    } catch {
      setScanError('No barcode found — try a clearer photo.')
    } finally {
      URL.revokeObjectURL(url)
      setIsScanning(false)
    }
  }
  const [title, setTitle] = useState('')
  const [priceChartingConsoleId, setPriceChartingConsoleId] = useState(
    POPULAR_PRICECHARTING_CONSOLE_IDS[0] ?? 'G8',
  )
  useEffect(() => {
    const list = platformsQuery.data
    if (!list?.length) return
    const valid = list.some((c) => c.id === priceChartingConsoleId)
    if (!valid) {
      const preferred = POPULAR_PRICECHARTING_CONSOLE_IDS.find((id) =>
        list.some((c) => c.id === id),
      )
      setPriceChartingConsoleId(preferred ?? list[0].id)
    }
  }, [platformsQuery.data, priceChartingConsoleId])
  const debouncedTitle = useDebouncedValue(title, 400)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestionsQuery = useQuery({
    queryKey: ['pc-product-suggestions', debouncedTitle, priceChartingConsoleId] as const,
    queryFn: () => {
      const sp = new URLSearchParams()
      sp.set('q', debouncedTitle.trim())
      sp.set('console', priceChartingConsoleId)
      return apiFetch<PriceChartingProductSuggestionDto[]>(
        `/product-suggestions?${sp.toString()}`,
      )
    },
    enabled:
      debouncedTitle.trim().length >= 2 &&
      Boolean(priceChartingConsoleId) &&
      !platformsQuery.isLoading,
    staleTime: 30_000,
  })

  const [publisher, setPublisher] = useState('')
  const [copyClassification, setCopyClassification] =
    useState<CopyClassificationTag>(CopyClassification.CIB)
  const [copyNotes, setCopyNotes] = useState('')
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [purchaseCurrency, setPurchaseCurrency] = useState('USD')
  const [offerAmount, setOfferAmount] = useState('')
  const [offerCurrency, setOfferCurrency] = useState('USD')
  const [syncPriceCharting, setSyncPriceCharting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const suggestions = suggestionsQuery.data ?? []
  const showSuggestions =
    suggestOpen &&
    debouncedTitle.trim().length >= 2 &&
    Boolean(priceChartingConsoleId)

  function scheduleBlurClose() {
    blurCloseTimer.current = setTimeout(() => setSuggestOpen(false), 180)
  }

  function cancelBlurClose() {
    if (blurCloseTimer.current) clearTimeout(blurCloseTimer.current)
  }

  function applySuggestion(s: PriceChartingProductSuggestionDto) {
    setTitle(s.productName)
    const gid = findBestPriceChartingConsoleIdFromApiConsoleName(s.consoleName)
    if (gid) setPriceChartingConsoleId(gid)
    setSuggestOpen(false)
  }

  const create = useMutation({
    mutationFn: () => {
      const digits = upc.replace(/\D/g, '')
      if (digits.length < 8) throw new Error('UPC must be at least 8 digits')
      return apiFetch<EditionDetailDto>('/editions', {
        method: 'POST',
        body: JSON.stringify({
          upc: digits,
          title: title.trim(),
          priceChartingConsoleId,
          publisher: publisher.trim() || undefined,
          syncPriceCharting,
          initialCopyClassification: copyClassification,
          initialCopyNotes: copyNotes.trim() || undefined,
          ...(purchaseAmount.trim()
            ? {
                initialPurchaseAmount: purchaseAmount.trim(),
                initialPurchaseCurrency: purchaseCurrency.trim() || 'USD',
              }
            : {}),
          ...(offerAmount.trim()
            ? {
                initialOfferAmount: offerAmount.trim(),
                initialOfferCurrency: offerCurrency.trim() || 'USD',
              }
            : {}),
        }),
      })
    },
    onSuccess: (edition) => {
      void queryClient.invalidateQueries({ queryKey: ['editions'] })
      void navigate({ to: '/inventory/$editionId', params: { editionId: edition.id } })
    },
    onError: (e) => {
      setFormError(e instanceof Error ? e.message : 'Failed to create edition')
    },
  })

  return (
    <div className={pageClass}>
      <Link to="/inventory" className={backLinkClass}>
        ← Inventory
      </Link>

      <h1 className={pageTitleClass}>Add a game</h1>
      <Card>
        <div className={cardHeader}>
          <span className={css({ fontSize: 'base', fontWeight: 'medium', color: 'foreground' })}>
            Edition details
          </span>
        </div>
        <div className={cardBody}>
          <form
            className={formBodyClass}
            onSubmit={(ev) => {
              ev.preventDefault()
              setFormError(null)
              create.mutate()
            }}
          >
            {formError && <p className={errorClass}>{formError}</p>}

            <div className={fieldClass}>
              <Label htmlFor="upc">UPC (digits only, 8–14)</Label>
              <div className={css({ display: 'flex', gap: '2', alignItems: 'center' })}>
                <Input
                  id="upc"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={upc}
                  onChange={(e) => setUpc(e.target.value)}
                  required
                  className={css({ flex: '1', width: 'auto' })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isScanning}
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Scan barcode with camera"
                >
                  <Camera size={16} />
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleScan}
                />
              </div>
              {scanError && (
                <p className={css({ fontSize: 'xs', color: 'danger', mt: '1', mb: '0' })}>
                  {scanError}
                </p>
              )}
            </div>

            <div className={css({ display: 'block' })}>
              <Label htmlFor="console">Console (PriceCharting)</Label>
              <Select
                id="console"
                value={priceChartingConsoleId}
                onChange={(e) => setPriceChartingConsoleId(e.target.value)}
                disabled={platformsQuery.isLoading || sortedConsoles.length === 0}
              >
                {sortedConsoles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </Select>
              <p className={css({ fontSize: 'xs', color: 'foregroundMuted', mt: '1', mb: '0' })}>
                Narrows title suggestions to this platform. Same IDs as{' '}
                <a
                  href="https://www.pricecharting.com/api-documentation#console-ids"
                  target="_blank"
                  rel="noreferrer"
                  className={css({ color: 'accent' })}
                >
                  PriceCharting&apos;s console table
                </a>
                .
              </p>
            </div>

            <div className={fieldClass}>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                autoComplete="off"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setSuggestOpen(true)
                }}
                onFocus={() => {
                  cancelBlurClose()
                  setSuggestOpen(true)
                }}
                onBlur={scheduleBlurClose}
                onKeyDown={(ev) => {
                  if (ev.key === 'Escape') setSuggestOpen(false)
                }}
                required
                maxLength={500}
                role="combobox"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="pc-title-suggestions"
                aria-autocomplete="list"
              />
              {showSuggestions && (
                <div
                  id="pc-title-suggestions"
                  role="listbox"
                  className={suggestPanelClass}
                  onMouseDown={cancelBlurClose}
                >
                  {suggestionsQuery.isFetching && (
                    <div
                      className={css({
                        px: '3',
                        py: '2',
                        fontSize: 'sm',
                        color: 'foregroundMuted',
                      })}
                    >
                      Searching PriceCharting…
                    </div>
                  )}
                  {!suggestionsQuery.isFetching && suggestionsQuery.isError && (
                      <div
                        className={css({
                          px: '3',
                          py: '2',
                          fontSize: 'sm',
                          color: 'danger',
                        })}
                      >
                        Could not load suggestions (check API token / network).
                      </div>
                    )}
                  {!suggestionsQuery.isFetching &&
                    !suggestionsQuery.isError &&
                    suggestions.length === 0 && (
                      <div
                        className={css({
                          px: '3',
                          py: '2',
                          fontSize: 'sm',
                          color: 'foregroundMuted',
                        })}
                      >
                        No matches — keep typing or enter the title manually.
                      </div>
                    )}
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      className={suggestRowClass}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(s)}
                    >
                      <span>{s.productName}</span>
                      <span className={css({ color: 'foregroundMuted', ml: '2', fontSize: 'xs' })}>
                        {s.consoleName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <p className={css({ fontSize: 'xs', color: 'foregroundMuted', mt: '1', mb: '0' })}>
                Type at least 2 characters for suggestions. Choosing one fills the exact PriceCharting
                title and matching console when possible.
              </p>
            </div>

            <div
              className={css({
                display: 'grid',
                gap: '3',
                p: '3',
                borderRadius: 'btn',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'border',
                bg: 'background',
              })}
            >
              <span
                className={css({
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'foreground',
                })}
              >
                Your first copy
              </span>
              <div
                className={css({
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '3',
                  alignItems: 'flex-end',
                })}
              >
                <div className={css({ flex: '1', minWidth: '160px' })}>
                  <Label htmlFor="copy-class">Condition</Label>
                  <Select
                    id="copy-class"
                    value={copyClassification}
                    onChange={(e) =>
                      setCopyClassification(e.target.value as CopyClassificationTag)
                    }
                  >
                    {CLASSIFICATION_OPTIONS.map((x) => (
                      <option key={x} value={x}>
                        {x.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className={css({ flex: '2', minWidth: '200px' })}>
                  <Label htmlFor="copy-notes">Copy notes (optional)</Label>
                  <Input
                    id="copy-notes"
                    value={copyNotes}
                    onChange={(e) => setCopyNotes(e.target.value)}
                    placeholder="e.g. sealed, sticker on box"
                    maxLength={2000}
                  />
                </div>
              </div>

              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' },
                  gap: '3',
                })}
              >
                <div>
                  <Label htmlFor="purchase-amt">Purchase price (optional)</Label>
                  <div className={css({ display: 'flex', gap: '2', alignItems: 'stretch' })}>
                    <Input
                      id="purchase-amt"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                      placeholder="0.00"
                      className={css({ flex: '1', minWidth: '0' })}
                    />
                    <Input
                      id="purchase-ccy"
                      type="text"
                      autoComplete="off"
                      value={purchaseCurrency}
                      onChange={(e) =>
                        setPurchaseCurrency(e.target.value.toUpperCase().slice(0, 3))
                      }
                      placeholder="USD"
                      maxLength={3}
                      aria-label="Purchase currency"
                      className={css({ width: '76px', flexShrink: 0 })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="offer-amt">Offer / asking price (optional)</Label>
                  <div className={css({ display: 'flex', gap: '2', alignItems: 'stretch' })}>
                    <Input
                      id="offer-amt"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={offerAmount}
                      onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="0.00"
                      className={css({ flex: '1', minWidth: '0' })}
                    />
                    <Input
                      id="offer-ccy"
                      type="text"
                      autoComplete="off"
                      value={offerCurrency}
                      onChange={(e) =>
                        setOfferCurrency(e.target.value.toUpperCase().slice(0, 3))
                      }
                      placeholder="USD"
                      maxLength={3}
                      aria-label="Offer currency"
                      className={css({ width: '76px', flexShrink: 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={css({ display: 'block' })}>
              <Label htmlFor="publisher">
                Publisher{' '}
                <span className={css({ color: 'foregroundMuted', fontWeight: 'normal' })}>
                  (optional)
                </span>
              </Label>
              <Input
                id="publisher"
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                maxLength={200}
              />
            </div>

            <label className={checkboxRowClass}>
              <input
                type="checkbox"
                checked={syncPriceCharting}
                onChange={(e) => setSyncPriceCharting(e.target.checked)}
                style={{ marginTop: '2px' }}
              />
              <span className={checkboxLabelClass}>
                Also fetch market snapshot (prices) after save{' '}
                <span className={css({ color: 'foregroundMuted' })}>
                  (product is linked to PriceCharting on save; this only loads FMV snapshot)
                </span>
              </span>
            </label>

            <div className={actionRowClass}>
              <Button type="submit" variant="primary" disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Save edition'}
              </Button>
              <Link
                to="/inventory"
                className={buttonVariants({ variant: 'ghost', size: 'md' })}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
