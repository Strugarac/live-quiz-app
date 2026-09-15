import { Client, TickerStrategy, type StompSubscription } from '@stomp/stompjs'
import { REQUEST_STATE, USER_QUEUE, type LiveEvent } from './liveTypes'

export type LiveConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'closed'

export interface LiveClientOptions {
  /** CONNECT headers: `role: 'HOST'` + `sessionId`, or `participantToken`. */
  connectHeaders: Record<string, string>
  /** Broadcast topics to subscribe to. The private user queue is always added. */
  topics: string[]
  onEvent: (event: LiveEvent) => void
  onStatus: (status: LiveConnectionStatus) => void
  /** Log frames to the console; useful for checking the negotiated heart-beat header. */
  debug?: boolean
}

export interface LiveClient {
  publish: (destination: string, body?: unknown) => void
  deactivate: () => void
}

function brokerUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  // Same origin, so the Vite dev proxy (or nginx on the server) forwards this to the
  // backend's /ws endpoint; BASE_URL ends with a slash ('/' in dev, '/livequiz/' on the server).
  return `${scheme}://${window.location.host}${import.meta.env.BASE_URL}ws`
}

/**
 * Opens a STOMP connection and re-subscribes on every (re)connect.
 *
 * Heartbeats are the thing to be careful with here. Browsers throttle timers in
 * backgrounded tabs to about once a minute and can freeze them entirely, which made
 * RabbitMQ close connections for missed client heartbeats during Step 5 testing.
 * `TickerStrategy.Worker` moves the outgoing heartbeat onto a Web Worker, whose timers
 * are not throttled — and `heartbeatOutgoing` must stay non-zero for that to help:
 * setting it to 0 stops the client heartbeating while the broker still expects one.
 *
 * Every subscribe happens inside onConnect, followed by a state request, so a drop and
 * reconnect resyncs by itself. That is what the SESSION_STATE snapshot exists for.
 */
export function createLiveClient(options: LiveClientOptions): LiveClient {
  const { connectHeaders, topics, onEvent, onStatus, debug = false } = options

  let subscriptions: StompSubscription[] = []
  /** Set when we deactivate on purpose, to avoid reporting that as a reconnect. */
  let closing = false

  const client = new Client({
    brokerURL: brokerUrl(),
    connectHeaders,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    heartbeatStrategy: TickerStrategy.Worker,
    // Must always be a function. Client.configure does Object.assign(this, conf), so
    // passing `undefined` replaces stompjs's own no-op default and every internal
    // this.debug(...) call throws — inside an async _connect() that nobody awaits, which
    // means the socket silently never opens.
    debug: debug ? (message) => console.debug('[stomp]', message) : () => {},
  })

  const handleMessage = (body: string) => {
    try {
      onEvent(JSON.parse(body) as LiveEvent)
    } catch {
      console.warn('[stomp] ignoring unparseable frame', body)
    }
  }

  client.onConnect = () => {
    subscriptions = [...topics, USER_QUEUE].map((destination) =>
      client.subscribe(destination, (message) => handleMessage(message.body)),
    )
    onStatus('connected')
    // Resync: covers both the first connect and every reconnect.
    client.publish({ destination: REQUEST_STATE, body: '{}' })
  }

  client.onWebSocketClose = () => {
    subscriptions = []
    onStatus(closing ? 'closed' : 'reconnecting')
  }

  client.onWebSocketError = (event) => {
    console.error('[stomp] websocket error', event)
  }

  client.onStompError = (frame) => {
    // The interceptor rejects bad CONNECT/SUBSCRIBE frames with a message here.
    onEvent({
      type: 'ERROR',
      at: new Date().toISOString(),
      payload: { code: 'STOMP_ERROR', message: frame.headers.message ?? 'Connection rejected' },
    })
  }

  onStatus('connecting')
  client.activate()

  return {
    publish: (destination, body) => {
      if (client.connected) {
        client.publish({ destination, body: JSON.stringify(body ?? {}) })
      }
    },
    deactivate: () => {
      closing = true
      subscriptions.forEach((subscription) => {
        try {
          subscription.unsubscribe()
        } catch {
          // Already gone with the socket; nothing to do.
        }
      })
      subscriptions = []
      void client.deactivate()
      onStatus('closed')
    },
  }
}
