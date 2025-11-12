/**
 * Generates a changes object by comparing previous and current data.
 * Returns an object where keys are changed field names and values are formatted as "oldValue → newValue".
 * 
 * @param previous - The previous state/object
 * @param current - The current/updated state/object
 * @returns Object with changed fields and their formatted change strings
 */
export function generateChanges(previous: Record<string, any>, current: Record<string, any>): Record<string, string> {
  const changes: Record<string, string> = {};

  // Field name mapping for better display
  const fieldNameMap: Record<string, string> = {
    product_id: 'Product ID',
    order_id: 'Order ID',
    name: 'Name',
    category: 'Category',
    price: 'Price',
    amount: 'Amount',
    stock: 'Stock',
    status: 'Status',
    customer_name: 'Customer Name',
    phone: 'Phone',
    address: 'Address',
    product: 'Product',
  };

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

  for (const key of allKeys) {
    const oldValue = previous[key];
    const newValue = current[key];

    // Skip if values are the same
    if (oldValue === newValue) continue;

    // Handle null/undefined
    const oldStr = oldValue === null || oldValue === undefined ? 'N/A' : String(oldValue);
    const newStr = newValue === null || newValue === undefined ? 'N/A' : String(newValue);

    // Format numbers with locale formatting
    let formattedChange: string;
    if (typeof oldValue === 'number' && typeof newValue === 'number') {
      formattedChange = `${oldValue.toLocaleString('vi-VN')} → ${newValue.toLocaleString('vi-VN')}`;
    } else {
      formattedChange = `${oldStr} → ${newStr}`;
    }

    // Use friendly field name if available
    const displayKey = fieldNameMap[key] || key;
    changes[displayKey] = formattedChange;
  }

  return changes;
}

