import 'reflect-metadata'
import { describe } from 'vitest'

import * as inferdi from '../containers/inferdi.js'
import * as inversify from '../containers/inversify.js'
import * as awilix from '../containers/awilix.js'
import * as tsyringe from '../containers/tsyringe.js'
import * as typedi from '../containers/typedi.js'
import * as typedInject from '../containers/typed-inject.js'
import { b } from './_helpers.js'

describe('07 lazy resolve (deferred resolution wrapper)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  for (const r of [ifd, inv, awP, awC, tsy, tdi, tin]) r.resolveLazy()

  b('inferdi',          () => ifd.resolveLazy())
  b('inversify',        () => inv.resolveLazy())
  b('awilix (PROXY)',   () => awP.resolveLazy())
  b('awilix (CLASSIC)', () => awC.resolveLazy())
  b('tsyringe',         () => tsy.resolveLazy())
  b('typedi',           () => tdi.resolveLazy())
  b('typed-inject',     () => tin.resolveLazy())
})
