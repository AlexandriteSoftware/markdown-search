# import

This rule formats `ImportDeclaration` nodes.

`ImportDeclaration` has the following structure:

- `specifiers` (array of `ImportSpecifier`, `ImportDefaultSpecifier`,
  or `ImportNamespaceSpecifier`)
  - `ImportSpecifier` (for named imports, e.g., `{ readFile }`)
  - `ImportDefaultSpecifier` (for default imports, e.g., `fs`)
  - `ImportNamespaceSpecifier` (for namespace imports, e.g., `* as fs`)
- `source` (the module specifier, e.g., `'node:fs/promises'`)

## Tests

```ts
import { readFile }
  from 'normal';
// ---
import { readFile }
  from 'normal';
```

```ts
import{readFile}from'liner';
// ---
import { readFile }
  from 'liner';
```

```ts
import{readFile,writeFile}from'double-liner';
// ---
import { readFile,
         writeFile }
  from 'double-liner';
```

```ts
import{readFile as rf}from'as-liner';
// ---
import { readFile as rf }
  from 'as-liner';
```

```ts
import path from'all-liner';
// ---
import path
  from 'all-liner';
```

```ts
import * as fs from'node:fs';
// ---
import * as fs
  from 'node:fs';
```

```ts
import{readFile}from'node:fs/promises';
// ---
import { readFile }
  from 'node:fs/promises';
```

```ts
import{readFile as rf}from'node:fs/promises';
// ---
import { readFile as rf }
  from 'node:fs/promises';
```

```ts
import path,{readFile}from'node:fs/promises';
// ---
import path,
       { readFile }
  from 'node:fs/promises';
```

```ts
import path,* as fs from'node:fs';
// ---
import path,
       * as fs
  from 'node:fs';
```

```ts
import{}from'./empty.js';
// ---
import { }
  from './empty.js';
```

```ts
import './direct.js';
// ---
import './direct.js';
```

```ts
import{readFile}from'node:fs/promises';
import{writeFile}from'node:fs/promises';
// ---
import { readFile }
  from 'node:fs/promises';
import { writeFile }
  from 'node:fs/promises';
```

```ts
import type { writeFile } from'import-type';
// ---
import { type writeFile }
  from 'import-type';
```

```ts
import type { writeFile, readFile } from'node:fs/promises';
// ---
import { type writeFile,
         type readFile }
  from 'node:fs/promises';
```

```ts
import { type writeFile } from'node:fs/promises';
// ---
import { type writeFile }
  from 'node:fs/promises';
```
