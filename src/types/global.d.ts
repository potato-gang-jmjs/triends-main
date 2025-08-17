// 글로벌 타입 정의
declare global {
  interface Window {
    crypto: Crypto;
  }
  
  interface Crypto {
    getRandomValues: (array: Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView | null) => Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array | DataView;
    randomUUID?: () => string;
  }
}

export {}; 