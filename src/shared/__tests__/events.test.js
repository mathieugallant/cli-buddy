import { describe, it, expect } from 'vitest'
import { IPC_EVENTS, TERMINAL_EVENTS, COMMAND_EVENTS } from '../events.js'

describe('Event Constants', () => {
  it('should have consolidated IPC_EVENTS object', () => {
    expect(IPC_EVENTS.TERMINAL).toBe(TERMINAL_EVENTS)
    expect(IPC_EVENTS.COMMAND).toBe(COMMAND_EVENTS)
  })

  it('should ensure all event names are unique', () => {
    const allEvents = [
      ...Object.values(TERMINAL_EVENTS),
      ...Object.values(COMMAND_EVENTS)
    ]
    
    const uniqueEvents = new Set(allEvents)
    expect(uniqueEvents.size).toBe(allEvents.length)
  })

  it('should follow consistent naming convention', () => {
    Object.values(TERMINAL_EVENTS).forEach(event => {
      expect(event).toMatch(/^terminal:/)
    })
  })
})