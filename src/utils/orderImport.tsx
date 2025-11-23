import React from 'react';
import type { OrderInput } from '../hooks/useOrders';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Circle } from 'lucide-react';
import { chunkArray } from './chunk';

export interface DuplicateCheckResult {
    hasDuplicates: boolean;
    messageJsx?: ReactNode;
}

/**
 * Check for duplicate order IDs within a batch of incoming orders (file or corrected orders)
 * and against existing orders in Supabase for a given user.
 * Behaviour matches the AddOrderModal logic exactly.
 */
export async function checkDuplicateOrderIds(
    orders: OrderInput[],
    userId: string,
    supabase: SupabaseClient
): Promise<DuplicateCheckResult> {
    // A. Check for duplicates within the file
    const fileOrderIds = orders.map((o, idx) => ({ orderId: o.order_id, rowIndex: idx + 1 }));
    const fileDuplicateMap = new Map<string, number[]>();
    fileOrderIds.forEach(({ orderId, rowIndex }) => {
        if (orderId) {
            if (!fileDuplicateMap.has(orderId)) {
                fileDuplicateMap.set(orderId, []);
            }
            fileDuplicateMap.get(orderId)!.push(rowIndex);
        }
    });
    const fileDuplicates: Array<{ orderId: string; rows: number[] }> = [];
    fileDuplicateMap.forEach((rows, orderId) => {
        if (rows.length > 1) {
            fileDuplicates.push({ orderId, rows });
        }
    });

    // B. Check for duplicates in existing orders
    const orderIdsToCheck = orders.map(o => o.order_id).filter(Boolean);
    let existingOrderIds: string[] = [];
    if (orderIdsToCheck.length > 0 && userId) {
        const chunks = chunkArray(orderIdsToCheck);

        for (const chunk of chunks) {
            const { data: existingOrders, error: fetchError } = await supabase
                .from('orders')
                .select('order_id')
                .eq('user_id', userId)
                .in('order_id', chunk);

            if (fetchError) {
                console.error('[import] Failed to fetch existing orders for chunk', fetchError);
                // Throwing to prevent importing duplicates if check fails
                throw fetchError;
            }

            if (existingOrders) {
                const ids = existingOrders.map(o => o.order_id).filter(Boolean) as string[];
                existingOrderIds.push(...ids);
            }
        }
    }

    // If any duplicates found, build the warning message
    if (fileDuplicates.length > 0 || existingOrderIds.length > 0) {
        const duplicateMessage = (
            <div className="space-y-3" >
                {/* Top section - warning yellow */}
                < div >
                    <p className="font-semibold text-yellow-300" > We couldn't import this file.</p>
                    < p className="text-yellow-300/90 mt-1" > Please fix the following issues: </p>
                </div>

                {/* Duplicate Order IDs in file - critical (red inside yellow toast) */}
                {
                    fileDuplicates.length > 0 && (
                        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-3" >
                            <p className="font-bold text-red-400 mb-2" > Duplicate Order IDs in your file: </p>
                            < ul className="space-y-1.5" >
                                {
                                    fileDuplicates.map((dup, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-red-300" >
                                            <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                                            <span>{dup.orderId}(found in rows {dup.rows.join(', ')}) </span>
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                    )
                }

                {/* Order IDs that already exist in DB - critical (red inside yellow toast) */}
                {
                    existingOrderIds.length > 0 && (
                        <div className={fileDuplicates.length > 0 ? "mt-3" : "mt-4"}>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3" >
                                <p className="font-bold text-red-400 mb-2" > Order IDs that already exist in your account: </p>
                                < ul className="space-y-1.5" >
                                    {
                                        existingOrderIds.map((orderId, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-sm text-red-300" >
                                                <Circle className="w-3 h-3 fill-red-400 text-red-400 mt-1 flex-shrink-0" />
                                                <span>{orderId} </span>
                                            </li>
                                        ))
                                    }
                                </ul>
                            </div>
                        </div>
                    )
                }

                {/* Footer message - normal text */}
                <p className="text-white/80 text-sm mt-3" >
                    Order ID must be unique.Please update the values in your spreadsheet and upload again.
                </p>
            </div>
        );

        return { hasDuplicates: true, messageJsx: duplicateMessage };
    }

    return { hasDuplicates: false };
}

/**
 * Insert orders and log each success with logUserAction, keeping the same behaviour
 * as current AddOrderModal code.
 */
export async function insertOrdersWithLogging(
    orders: OrderInput[],
    userId: string,
    insertOrders: (orders: OrderInput[]) => Promise<{
        success: number;
        failed: number;
        errors: string[];
    }>,
    logUserAction: (params: {
        userId: string;
        action: string;
        status: 'success' | 'failed';
        orderId?: string;
    }) => Promise<void>,
): Promise<{
    success: number;
    failed: number;
    errors: string[];
}> {
    // Use insertOrders from useOrders hook (handles payment_method, status, risk_score, paid_at)
    const result = await insertOrders(orders);

    if (result.success > 0) {
        // Log user action for each successfully created order
        // We iterate over the input orders. Note that if some failed, we might log success for them if we don't know which ones failed.
        // However, the original code iterated over 'validOrders' (which is the input here) and logged success for all of them if result.success > 0.
        // Wait, the original code:
        // if (result.success > 0) {
        //   for (const orderData of validOrders) { ... log success ... }
        // }
        // This implies it logs success for ALL orders even if some failed?
        // Let's check the original code again.
        // "if (result.success > 0) { ... for (const orderData of validOrders) { ... log ... } }"
        // Yes, it seems to log for all of them. This might be a slight bug in the original code if partial success happens,
        // but the requirement is to KEEP EXISTING BEHAVIOUR.
        // Actually, insertOrders usually returns success count.
        // If I look at useOrders.ts (not visible here but inferred), insertOrders probably tries to insert all.
        // If partial failure is possible, the original code logs success for ALL of them if at least one succeeded.
        // I will strictly follow the original code's logic.

        for (const orderData of orders) {
            if (userId) {
                await logUserAction({
                    userId: userId,
                    action: 'Create Order',
                    status: 'success',
                    orderId: orderData.order_id ?? "",
                });
            }
        }
    }

    return result;
}
