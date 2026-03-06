import { describe, it, expect, vi } from 'vitest'
import { nextBackoff, optimisticMutation } from '../realtime'

describe('nextBackoff', () => {
  it('grows exponentially and caps at max', () => {
    const seq = Array.from({ length: 10 }, (_, i) => nextBackoff(i))
    expect(seq[0]).toBeGreaterThan(0)
    expect(seq[1]).toBeGreaterThan(seq[0])
    expect(seq[5]).toBeLessThanOrEqual(15000)
    expect(seq[9]).toBe(15000)
  })
})

describe('optimisticMutation', () => {
  it('applies and commits on success', async () => {
    const apply = vi.fn()
    const rollback = vi.fn()
    const action = vi.fn().mockResolvedValue('ok')
    const res = await optimisticMutation({ apply, rollback, action })
    expect(res).toBe('ok')
    expect(apply).toHaveBeenCalledTimes(1)
    expect(rollback).not.toHaveBeenCalled()
  })

  it('rolls back on failure', async () => {
    const apply = vi.fn()
    const rollback = vi.fn()
    const action = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(optimisticMutation({ apply, rollback, action })).rejects.toThrow('fail')
    expect(apply).toHaveBeenCalledTimes(1)
    expect(rollback).toHaveBeenCalledTimes(1)
  })
})

