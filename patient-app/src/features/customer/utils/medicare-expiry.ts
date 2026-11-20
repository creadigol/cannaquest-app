import { isValid, parseISO } from 'date-fns';

const MONTH_YEAR = /^(0[1-9]|1[0-2])\/(\d{4})$/;
const ISO_YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])(?:$|-\d{2}(?:$|T| ))/;

export const MEDICARE_EXPIRY_ERROR = 'Please enter a valid Medicare expiry (MM/YYYY).';

function isIsoExpiry(value: string): boolean {
    return ISO_YEAR_MONTH.test(value) && isValid(parseISO(value));
}

export function isValidMedicareExpiry(value: string): boolean {
    const trimmed = value.trim();
    return MONTH_YEAR.test(trimmed) || isIsoExpiry(trimmed);
}

/** Format for display only; callers keep the original value in form state. */
export function formatMedicareExpiry(value: string | null | undefined): string {
    if (!value) return '';
    const trimmed = value.trim();
    return isIsoExpiry(trimmed) ? `${trimmed.slice(5, 7)}/${trimmed.slice(0, 4)}` : trimmed;
}

export function medicareExpiryForApi(value: string | null | undefined): string | null | undefined {
    if (value == null) return value;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const monthYear = MONTH_YEAR.exec(trimmed);
    if (monthYear) {
        // Month-only expiries represent the final day of that month. UTC and
        // setUTCFullYear avoid local-time shifts and Date's special 0–99 years.
        const endOfMonth = new Date(0);
        endOfMonth.setUTCFullYear(Number(monthYear[2]), Number(monthYear[1]), 0);
        return endOfMonth.toISOString().slice(0, 10);
    }

    // Preserve existing dates/timestamps exactly, including an explicit day or
    // timezone. Opening and saving another field must not shift the expiry.
    if (isIsoExpiry(trimmed)) return trimmed;
    throw new Error(MEDICARE_EXPIRY_ERROR);
}
