import { describe, it, expect, vi } from 'vitest'
import { subscribeToTableWithClient, nextBackoff } from '../realtime'

const makeMockClient = () => {
  const handlers: any[] = []
  let subscribedCb: any = null
  const channel = {
    on: vi.fn().mockImplementation((_event, _filter, cb) => {
      handlers.push(cb)
      return channel
    }),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      subscribedCb = cb
      // simulate immediate subscribed
      cb('SUBSCRIBED')
    }),
    unsubscribe: vi.fn(),
  }
  const client = {
    channel: vi.fn().mockReturnValue(channel),
    _channel: channel,
    _trigger: (status: string, payload?: any) => {
      if (status === 'SUBSCRIBED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        subscribedCb && subscribedCb(status)
      }
      if (payload) {
        handlers.forEach((h) => h(payload))
      }
    },
  }
  return client as any
}

describe('subscribeToTableWithClient', () => {
  it('reconnects after timeout and calls onReconnect', async () => {
    vi.useFakeTimers()
    const client = makeMockClient()
    const onReconnect = vi.fn()
    subscribeToTableWithClient(
      client,
      { table: 'timesheets' },
      { onReconnect }
    )

    client._trigger('TIMED_OUT')
    // advance enough time for first backoff
    vi.advanceTimersByTime(nextBackoff(1))
    // should create a new channel and call onReconnect
    expect(client.channel).toHaveBeenCalledTimes(2)
    expect(onReconnect).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})

