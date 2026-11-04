/* eslint-disable react-refresh/only-export-components -- These exports form the shared production router adapter. */
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { RouteLink, useCurrentPath as useRouteLocation } from '../app/navigation'

export type AppPath = '/' | '/analytics' | '/datasets' | '/datasets/upload' | '/expenses' | '/inventory' | '/reports' | '/team' | '/activity' | '/settings' | '/settings/business' | '/settings/profile'

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  to: AppPath
  children: ReactNode
  onClick?: () => void
}

export function AppLink({ to, children, onClick, ...props }: AppLinkProps) {
  return <RouteLink to={to} {...props} onClick={(event) => { onClick?.(); if (event.defaultPrevented) return }}>{children}</RouteLink>
}

export function useCurrentPath() {
  return useRouteLocation().pathname
}
