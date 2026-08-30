import { Component, type ReactNode } from 'react'

/**
 * Error boundary that remounts its children after a backoff delay instead of crashing the
 * scene — a heavy model (e.g. GreekEnvironment's OBJ+MTL) can fail to load on a slow/weak
 * machine (timeout, transient network error), and retrying quietly is better than leaving
 * the background permanently missing or taking down the whole Canvas tree.
 */
export class RetryOnError extends Component<
  { children: ReactNode; maxDelayMs?: number },
  { hasError: boolean; attempt: number }
> {
  state = { hasError: false, attempt: 0 }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    const delay = Math.min(1000 * 2 ** this.state.attempt, this.props.maxDelayMs ?? 8000)
    setTimeout(() => this.setState((s) => ({ hasError: false, attempt: s.attempt + 1 })), delay)
  }

  render() {
    // Render nothing while an error is pending retry, rather than re-throwing immediately.
    if (this.state.hasError) return null
    // Key change forces a fresh mount (fresh hook state) on each retry attempt.
    return <group key={this.state.attempt}>{this.props.children}</group>
  }
}
