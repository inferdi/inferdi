import 'reflect-metadata'
import { describe } from 'vitest'

import * as inferdi from '../containers/inferdi.js'
import * as inversify from '../containers/inversify.js'
import * as awilix from '../containers/awilix.js'
import * as tsyringe from '../containers/tsyringe.js'
import * as typedi from '../containers/typedi.js'
import * as typedInject from '../containers/typed-inject.js'
import { b } from './_helpers.js'

describe('02 transient resolve (new instance per resolve)', () => {
  const ifd = inferdi.buildRoot()
  const inv = inversify.buildRoot()
  const awP = awilix.buildRootProxy()
  const awC = awilix.buildRootClassic()
  const tsy = tsyringe.buildRoot()
  const tdi = typedi.buildRoot()
  const tin = typedInject.buildRoot()

  for (const r of [ifd, inv, awP, awC, tsy, tdi, tin]) r.resolveTransient()

  b('inferdi',          () => ifd.resolveTransient())
  b('inversify',        () => inv.resolveTransient())
  b('awilix (PROXY)',   () => awP.resolveTransient())
  b('awilix (CLASSIC)', () => awC.resolveTransient())
  b('tsyringe',         () => tsy.resolveTransient())
  b('typedi',           () => tdi.resolveTransient())
  b('typed-inject',     () => tin.resolveTransient())
})
