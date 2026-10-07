// Models the owner explicitly removed. Match the asset or its embedded identity,
// so a cached/renamed copy cannot restore a deleted selection.
const removed = [
  {file: '4475429325269774311.vrm', title: 'モブ子β', author: 'moncyuke'},
  {file: '8197612703181177878.vrm', title: 'bunnnygirl', author: 'k1ttyxkush'}
];
const norm = value => String(value || '').normalize('NFKC').toLowerCase().trim();
export function isRemovedAvatar(record = {}) {
  const values = [record.name, record.url].map(value => {
    try { return norm(decodeURIComponent(String(value || '')).split(/[\\/?#]/).filter(Boolean).at(-1)); }
    catch { return norm(value); }
  });
  const meta = record.meta || record;
  const title = norm(meta.title || meta.name);
  const author = norm(meta.author || (Array.isArray(meta.authors) ? meta.authors.join(', ') : ''));
  return removed.some(item => values.includes(norm(item.file)) ||
    (title === norm(item.title) && author === norm(item.author)));
}
export function removedAvatarBytes(bytes) {
  try {
    const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) :
      ArrayBuffer.isView(bytes) ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;
    if (!data || data.byteLength < 20) return false;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(16, true) !== 0x4e4f534a) return false;
    const length = view.getUint32(12, true);
    if (length > data.byteLength - 20 || length > 8 * 1024 * 1024) return false;
    const gltf = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + length)).replace(/\0+$/, '').trim());
    return isRemovedAvatar({meta: gltf.extensions?.VRM?.meta || gltf.extensions?.VRMC_vrm?.meta || {}});
  } catch { return false; }
}
export function isRemovedAvatarRecord(record) {
  return Boolean(record && (isRemovedAvatar(record) || removedAvatarBytes(record.bytes)));
}
