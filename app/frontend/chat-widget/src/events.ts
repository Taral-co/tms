type EventHandler<T = any> = (data: T) => void

export class EventEmitter<Events extends Record<string, any>> {
  private events: { [K in keyof Events]?: EventHandler<Events[K]>[] } = {}

  on<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event]!.push(handler)
  }

  off<K extends keyof Events>(event: K, handler: EventHandler<Events[K]>) {
    const handlers = this.events[event]
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]) {
    const handlers = this.events[event]
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }
}
