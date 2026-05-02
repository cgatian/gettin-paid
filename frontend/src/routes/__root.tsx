import { TanStackDevtools } from '@tanstack/react-devtools'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { css } from 'styled-system/css'
import { Sidebar } from '#/components/Sidebar'
import TanStackQueryDevtools from '#/integrations/tanstack-query/devtools'
import appCss from '#/styles.css?url'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: "Gettin' Paid" },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
})

const shellClass = css({
  display: 'flex',
  h: '100vh',
  overflow: 'hidden',
  bg: 'background',
  fontFamily: 'sans',
})

const mainClass = css({
  flex: '1',
  overflowY: 'auto',
  borderLeftWidth: '1px',
  borderLeftStyle: 'solid',
  borderLeftColor: 'borderSubtle',
  minW: '0',
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className={shellClass}>
          <Sidebar />
          <main className={mainClass}>
            {children}
          </main>
        </div>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            { name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
