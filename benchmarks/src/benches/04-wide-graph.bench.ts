import 'reflect-metadata'
import { describe } from 'vitest'

import * as inferdi from '../containers/inferdi.js'
import * as inversify from '../containers/inversify.js'
import * as awilix from '../containers/awilix.js'
import * as tsyringe from '../containers/tsyringe.js'
import * as typedi from '../containers/typedi.js'
import * as typedInject from '../containers/typed-inject.js'
import { b } from './_helpers.js'

describe('04a wide graph (4 deps, root transient)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  for (const r of [ifd, inv, awP, awC, tsy, tdi, tin]) r.resolveWide4()

  b('inferdi',          () => ifd.resolveWide4())
  b('inversify',        () => inv.resolveWide4())
  b('awilix (PROXY)',   () => awP.resolveWide4())
  b('awilix (CLASSIC)', () => awC.resolveWide4())
  b('tsyringe',         () => tsy.resolveWide4())
  b('typedi',           () => tdi.resolveWide4())
  b('typed-inject',     () => tin.resolveWide4())
})

describe('04b wide graph (10 deps, root transient)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  for (const r of [ifd, inv, awP, awC, tsy, tdi, tin]) r.resolveWide10()

  b('inferdi',          () => ifd.resolveWide10())
  b('inversify',        () => inv.resolveWide10())
  b('awilix (PROXY)',   () => awP.resolveWide10())
  b('awilix (CLASSIC)', () => awC.resolveWide10())
  b('tsyringe',         () => tsy.resolveWide10())
  b('typedi',           () => tdi.resolveWide10())
  b('typed-inject',     () => tin.resolveWide10())
})
