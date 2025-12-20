export async function downloadFileDirectly(url, filename) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('Failed to fetch invoice file');
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
}
