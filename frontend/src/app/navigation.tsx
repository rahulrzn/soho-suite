import { useSyncExternalStore } from 'react'
import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { hrefForRoute, resolveRoute } from './routes'

const locationListeners = new Set<() => void>()

function emitLocationChange() {
  for (const listener of locationListeners) listener()
}

function subscribe(listener: () => void) {
  locationListeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    locationListeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

function snapshot() {
  return `${window.location.pathname}${window.location.search}`
}

// eslint-disable-next-line react-refresh/only-export-components -- This hook is colocated with route navigation helpers.
export function useCurrentPath() {
  const current = useSyncExternalStore(subscribe, snapshot, () => '/')
  const queryStart = current.indexOf('?')
  const pathname = queryStart < 0 ? current : current.slice(0, queryStart)
  const search = queryStart < 0 ? '' : current.slice(queryStart)
  return { pathname, search, route: resolveRoute(pathname) }
}

// eslint-disable-next-line react-refresh/only-export-components -- Navigation state and its imperative helper share one module.
export function navigate(to: string, replace = false) {
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  emitLocationChange()
}

type RouteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: Parameters<typeof hrefForRoute>[0] | string
}

export function RouteLink({ to, onClick, ...props }: RouteLinkProps) {
  const href = typeof to === 'string' ? to : hrefForRoute(to)
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(href)
  }
  return <a href={href} {...props} onClick={handleClick} />
}
