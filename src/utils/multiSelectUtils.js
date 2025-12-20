/**
 * Utility functions for multi-select filter behavior
 */
/**
 * Check if "All" is effectively selected (empty array or all options selected)
 */
export function isAllSelected(selected, allOptions) {
    // Empty array means "All" is selected (no filter)
    if (selected.length === 0)
        return true;
    // All individual options selected also means "All"
    return selected.length === allOptions.length;
}
/**
 * Toggle the "All" option
 * When clicking "All", select all individual options
 */
export function toggleAllOption(allOptions) {
    // Select all individual options
    return [...allOptions];
}
/**
 * Toggle a single option in the selection
 * Automatically handles "All" unchecking when needed
 */
export function toggleSingleOption(selected, value, allOptions) {
    let next;
    if (selected.includes(value)) {
        //Deselecting an option
        next = selected.filter((v) => v !== value);
    }
    else {
        // Selecting an option
        next = [...selected, value];
    }
    // If all options are now selected, keep them all selected
    // (This shows individual checkmarks, not the "All" checkbox)
    return next;
}
/**
 * Get display text for multi-select dropdown
 */
export function getMultiSelectDisplayText(selected, allOptions, label) {
    if (selected.length === 0 || selected.length === allOptions.length) {
        return `All ${label}`;
    }
    return `${selected.length} selected`;
}
