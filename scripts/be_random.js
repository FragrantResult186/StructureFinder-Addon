export function unsignedMultiply(a, b) {
    const aLow = a & 0xffff;
    const aHigh = a >>> 16;
    const bLow = b & 0xffff;
    const bHigh = b >>> 16;
  
    return ((aLow * bLow) + ((aHigh * bLow + aLow * bHigh) << 16)) >>> 0;
  }
  
  export function mt_n_get(seed, n) {
    const STATE_SIZE = n + 397;
    const state = new Uint32Array(STATE_SIZE);
    const mt = new Uint32Array(n);
    const MULTIPLIER = 0x6c078965;
  
    state[0] = seed >>> 0;
    
    for (let i = 1; i < STATE_SIZE; i++) {
      const prev = state[i - 1];
      const xor = (prev ^ (prev >>> 30)) >>> 0;
      state[i] = (unsignedMultiply(xor, MULTIPLIER) + i) >>> 0;
    }
  
    for (let i = 0; i < n; i++) {
      const mask1 = state[i] & 0x80000000;
      const mask2 = state[i + 1] & 0x7fffffff;
      const y = (mask1 | mask2) >>> 0;
      const shifted = y >>> 1;
      const xorValue = (y & 1) ? 0x9908b0df : 0;
      mt[i] = ((shifted ^ xorValue) ^ state[i + 397]) >>> 0;
    }
  
    for (let i = 0; i < n; i++) {
      let y = mt[i];
      y = (y ^ (y >>> 11)) >>> 0;
      y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
      y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
      mt[i] = (y ^ (y >>> 18)) >>> 0;
    }
  
    return mt;
  }