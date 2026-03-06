type BackoffOpts = { baseMs?: number; maxMs?: number }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const nextBackoff = (attempt: number, opts?: BackoffOpts) => {
  const base = opts?.baseMs ?? 500
  const max = opts?.maxMs ?? 15000
  const t = Math.min(max, Math.round(base * 2 ** attempt))
  return t
}

type TableHandlers = {
  onInsert?: (p: any) => void
  onUpdate?: (p: any) => void
  onDelete?: (p: any) => void
  onError?: (e: any) => void
  onReconnect?: () => void
}

type SubscribeOpts = {
  schema?: string
  table: string
  filter?: { column: string; value: string }[]
}

export const subscribeToTableWithClient = (client: any, opts: SubscribeOpts, handlers: TableHandlers) => {
  const schema = opts.schema ?? 'public'
  const filters = opts.filter
    ?.map((f) => `${f.column}=eq.${f.value}`)
    .join(',')

  let attempt = 0
  let active = true
  let channel = client.channel(`rt_${schema}_${opts.table}_${Math.random().toString(36).slice(2)}`)

  const bind = () => {
    channel = client.channel(`rt_${schema}_${opts.table}_${Math.random().toString(36).slice(2)}`)
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema, table: opts.table, filter: filters },
        (payload) => handlers.onInsert?.(payload)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema, table: opts.table, filter: filters },
        (payload) => handlers.onUpdate?.(payload)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema, table: opts.table, filter: filters },
        (payload) => handlers.onDelete?.(payload)
      )

    channel.subscribe(async (status) => {
      if (!active) return
      if (status === 'SUBSCRIBED') {
        attempt = 0
      }
      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        try {
          attempt += 1
          handlers.onReconnect?.()
          const delay = nextBackoff(attempt)
          await wait(delay)
          if (!active) return
          channel.unsubscribe()
          bind()
        } catch (e) {
          handlers.onError?.(e)
        }
      }
    })
  }

  bind()

  return {
    unsubscribe: () => {
      active = false
      channel.unsubscribe()
    },
  }
}

// Consumers can pass their client explicitly to avoid importing the default client in environments (like unit tests)

export const optimisticMutation = async <T>({
  apply,
  rollback,
  action,
}: {
  apply: () => void
  rollback: () => void
  action: () => Promise<T>
}) => {
  apply()
  try {
    const res = await action()
    return res
  } catch (e) {
    rollback()
    throw e
  }
}
