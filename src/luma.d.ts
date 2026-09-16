export interface Light { x: number; y: number; z: number; intensity: number }
export interface LumaOptions { root?: Document | HTMLElement; light?: Partial<Light>; pointer?: boolean }
export interface LumaController {
  setLight(light: Partial<Light>): void;
  followPointer(enabled?: boolean): void;
  refresh(): void;
  destroy(): void;
}
export declare function createLuma(options?: LumaOptions): LumaController;
