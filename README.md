# d20js

TypeScript library for dice rolling.

## Example

```TypeScript
import * as d20 from 'd20js'

const expression = "1d20+5";
const roll = d20.roll(expression);
console.log(roll.total());    // e.g. 17
console.log(roll.toString()); // e.g. '[12] + 5'
```

## Grammar

[Peggy parser generator](https://github.com/peggyjs/peggy) is used to parse the expressions. The grammar is defined in [grammar.peggy in the scripts directory](./scripts/grammar.peggy), after which a converter for JavaScript is generated. If this grammar file is thus changed, a new JavaScript file needs to be generated using `npm run grammar`.