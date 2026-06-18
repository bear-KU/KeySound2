import { join } from 'path'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

export function loadNativeAddon(name: string): unknown {
  const bindings = require('bindings')
  return bindings({
    module_root: join(__dirname, '../../native'),
    bindings: name
  })
}
