import * as inferdi from './inferdi.js'
import * as inversify from './inversify.js'
import * as awilix from './awilix.js'
import * as tsyringe from './tsyringe.js'
import * as typedi from './typedi.js'
import * as typedInject from './typed-inject.js'
import { SUBJECT_NAMES } from './subject-names.js'
import type { Subject } from './types.js'

export const subjects: readonly Subject[] = [
  { name: SUBJECT_NAMES.inferdiFast, build: () => inferdi.buildRoot(true) },
  { name: SUBJECT_NAMES.inferdiDefault, build: () => inferdi.buildRoot(false) },
  { name: SUBJECT_NAMES.inversify, build: inversify.buildRoot },
  { name: SUBJECT_NAMES.awilixProxy, build: awilix.buildRootProxy },
  { name: SUBJECT_NAMES.awilixClassic, build: awilix.buildRootClassic },
  { name: SUBJECT_NAMES.tsyringe, build: tsyringe.buildRoot },
  { name: SUBJECT_NAMES.typedi, build: typedi.buildRoot },
  { name: SUBJECT_NAMES.typedInject, build: typedInject.buildRoot }
]

const balancedPositions = subjects.map((_, position) => {
  if (position === 0) return 0
  return position % 2 === 1
    ? (position + 1) / 2
    : subjects.length - position / 2
})

/*
 * A balanced Latin square distributes both process positions and immediate
 * predecessor effects, so launch-order drift cannot systematically favor one subject
 */
export function orderSubjects(round: number): readonly Subject[] {
  const offset = (round - 1) % subjects.length
  return balancedPositions.map((position) => subjects[(position + offset) % subjects.length]!)
}
