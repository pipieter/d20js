# d20js

TypeScript library for dice rolling.

## Example

```TypeScript
import * as d20 from 'd20js'

const expression = "1d20+5";
const roll = d20.roll(expression);
console.log(roll.total());    // e.g. 17
console.log(roll.toString()); // e.g. '[17] + 5'
```
