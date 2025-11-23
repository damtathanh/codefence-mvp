export const DEFAULT_CHUNK_SIZE = 200;

export function chunkArray<T>(array: T[], size: number = DEFAULT_CHUNK_SIZE): T[][] {
    if (size <= 0) return [array];
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}
