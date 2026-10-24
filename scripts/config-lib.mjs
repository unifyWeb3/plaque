// Fail-closed validation for config/plaque.json. The verifier and the consistency test call this
// before using any public chain parameter, so a malformed override cannot silently point at a
// different chain or contract.
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HASH32 = /^0x[0-9a-fA-F]{64}$/;

export function validateConfig(c) {
  if (!c || typeof c !== 'object') throw new Error('config is not an object');
  if (!Number.isSafeInteger(c.chainId) || c.chainId <= 0) throw new Error('chainId must be a positive safe integer');
  if (c.chainIdHex !== '0x' + c.chainId.toString(16)) throw new Error('chainIdHex does not match chainId');
  if (!/^https:\/\//.test(String(c.rpc))) throw new Error('rpc must be an https URL');
  if (!ADDRESS.test(String(c.contract))) throw new Error('contract is not a 20-byte address');
  if (!Number.isSafeInteger(c.deployBlock) || c.deployBlock <= 0) throw new Error('deployBlock must be positive');
  if (!Number.isSafeInteger(c.claimBlock) || c.claimBlock < c.deployBlock) throw new Error('claimBlock must follow deployBlock');
  if (!ADDRESS.test(String(c.claimant))) throw new Error('claimant is not an address');
  if (!ADDRESS.test(String(c.sponsor))) throw new Error('sponsor is not an address');
  if (!ADDRESS.test(String(c.deployer))) throw new Error('deployer is not an address');
  if (!HASH32.test(String(c.eventTopic))) throw new Error('eventTopic is not a 32-byte hash');
  if (!HASH32.test(String(c.storageSlot))) throw new Error('storageSlot is not a 32-byte hash');
  if (!HASH32.test(String(c.handleKey))) throw new Error('handleKey is not a 32-byte hash');
  if (!c.bytecode || typeof c.bytecode !== 'object') throw new Error('bytecode map is missing');
  for (const [name, v] of Object.entries(c.bytecode)) {
    if (!Number.isSafeInteger(v.bytes) || v.bytes <= 0) throw new Error(`${name}.bytes is invalid`);
    if (!HASH32.test(String(v.keccak))) throw new Error(`${name}.keccak is invalid`);
  }
  return c;
}
