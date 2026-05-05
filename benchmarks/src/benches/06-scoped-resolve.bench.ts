import 'reflect-metadata'
import { describe } from 'vitest'

import * as inferdi from '../containers/inferdi.js'
import * as inversify from '../containers/inversify.js'
import * as awilix from '../containers/awilix.js'
import * as tsyringe from '../containers/tsyringe.js'
import * as typedi from '../containers/typedi.js'
import * as typedInject from '../containers/typed-inject.js'
import { b } from './_helpers.js'

// Composite metric: creation + resolve + cleanup (where dispose is synchronous).
// inferdi/tsyringe/typedi pay the real cost of a sync dispose;
// awilix/typed-inject/inversify rely on GC. See README fairness note.
describe('06 scoped lifecycle (composite: create + resolve + cleanup)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  b('inferdi',          () => ifd.scopedResolveAndDispose())
  b('inversify',        () => inv.scopedResolveAndDispose())
  b('awilix (PROXY)',   () => awP.scopedResolveAndDispose())
  b('awilix (CLASSIC)', () => awC.scopedResolveAndDispose())
  b('tsyringe',         () => tsy.scopedResolveAndDispose())
  b('typedi',           () => tdi.scopedResolveAndDispose())
  b('typed-inject',     () => tin.scopedResolveAndDispose())
})
