export const DEFAULT_CHUNK_SIZE = 200;
export function chunkArray(array, size = DEFAULT_CHUNK_SIZE) {
    if (size <= 0)
        return [array];
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}
