/**
 * Always format timestamp to display as GMT+7 (Asia/Bangkok)
 */
export function formatToGMT7(utcTimestamp) {
    const date = new Date(utcTimestamp);
    // Format trực tiếp theo timezone Asia/Bangkok
    const optionsDate = { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
    const displayDate = date.toLocaleDateString('en-US', optionsDate).replace(',', ''); // "12 Nov 2025"
    const time = date.toLocaleTimeString('en-US', optionsTime); // "14:44"
    // Dạng YYYY-MM-DD để dùng cho filter
    const dateParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).formatToParts(date);
    const year = dateParts.find(p => p.type === 'year')?.value;
    const month = dateParts.find(p => p.type === 'month')?.value;
    const day = dateParts.find(p => p.type === 'day')?.value;
    const formattedDate = `${year}-${month}-${day}`;
    return {
        date: formattedDate,
        displayDate,
        time,
        dateTime: `${displayDate} ${time}`,
    };
}
/**
 * Always format timestamp to display as GMT+7 (Asia/Bangkok) - time only
 */
export function formatTimeToGMT7(utcTimestamp) {
    const date = new Date(utcTimestamp);
    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
    return date.toLocaleTimeString('en-US', optionsTime);
}
