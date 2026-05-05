import 'reflect-metadata'
import { describe } from 'vitest'

import * as inferdi from '../containers/inferdi.js'
import * as inversify from '../containers/inversify.js'
import * as awilix from '../containers/awilix.js'
import * as tsyringe from '../containers/tsyringe.js'
import * as typedi from '../containers/typedi.js'
import * as typedInject from '../containers/typed-inject.js'
import { b } from './_helpers.js'

// Each iteration builds a fresh container inside the resolver method and resolves one service.
// NOTE: for TypeDI/tsyringe decorators run at import time, so their "build" means
// child-context creation, not a full build (see README, fairness note).
describe('05 build + first resolve (cold container)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  b('inferdi',          () => ifd.buildAndResolve())
  b('inversify',        () => inv.buildAndResolve())
  b('awilix (PROXY)',   () => awP.buildAndResolve())
  b('awilix (CLASSIC)', () => awC.buildAndResolve())
  b('tsyringe',         () => tsy.buildAndResolve())
  b('typedi',           () => tdi.buildAndResolve())
  b('typed-inject',     () => tin.buildAndResolve())
})
