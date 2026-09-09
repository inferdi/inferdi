// @vitest-environment node

import {PassThrough} from 'node:stream'
import {Suspense} from 'react'
import {renderToPipeableStream} from 'react-dom/server'
import {describe, expect, it, vi} from 'vitest'
import {Container} from '@inferdi/inferdi'
import {inferdiReact} from '../src/index'

describe('@inferdi/react streaming server rendering', () => {
  it('keeps the async service promise stable across Suspense retries', async () => {
    let resolve!: (value: string) => void
    const service = new Promise<string>((next) => {
      resolve = next
    })
    const container = new Container().registerAsyncFactory('message', () => service, [])
    const getAsync = vi.spyOn(container, 'getAsync')
    const AppDI = inferdiReact<typeof container>()
    function App() {
      return <span>{AppDI.useAsyncService('message')}</span>
    }

    const errors: unknown[] = []
    let pipe!: (destination: PassThrough) => void
    const shellReady = new Promise<void>((ready, fail) => {
      pipe = renderToPipeableStream(
        <AppDI.Provider container={container}>
          <Suspense fallback={<span>loading</span>}><App /></Suspense>
        </AppDI.Provider>,
        {
          onShellReady: ready,
          onShellError: fail,
          onError: (error) => errors.push(error)
        }
      ).pipe
    })
    await shellReady
    expect(getAsync).toHaveBeenCalledTimes(1)

    const destination = new PassThrough()
    let html = ''
    destination.setEncoding('utf8')
    destination.on('data', (chunk: string) => {
      html += chunk
    })
    const completed = new Promise<void>((done, fail) => {
      destination.on('end', done)
      destination.on('error', fail)
    })
    pipe(destination)
    resolve('ready')
    await completed

    expect(errors).toEqual([])
    expect(getAsync).toHaveBeenCalledTimes(1)
    expect(html).toContain('ready')
  })
})
