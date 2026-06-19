export interface KeyboardDevice {
  name: string
  path: string
}

export interface StoreSchema {
  defaultSound: string
  keySounds: Record<string, string>
  selectedKeyboards: string[]
}
