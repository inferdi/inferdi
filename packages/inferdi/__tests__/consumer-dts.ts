import {Container} from '../dist/index.js'

using container = new Container().registerValue('answer', 42)

const answer: number = container.get('answer')

await using scope = container.createScope()

const scopedAnswer: number = scope.get('answer')

void answer
void scopedAnswer
