const WEIGHTS = [1, 3, 7, 9, 1, 3, 7, 9];

/**
 * Validates an Australian Medicare number based on the standard Luhn-like weighted check.
 * Identical algorithm to Private_Medi_Platform/resources/js/medicare.js and ValidMedicareNumber PHP rule.
 */
export function validateMedicare(value: string): { valid: boolean; error?: string } {
    const digits = value.replace(/\D/g, '');

    if (digits.length !== 10) {
        return { valid: false, error: 'Must be exactly 10 digits' };
    }

    const first = parseInt(digits[0], 10);
    if (first < 2 || first > 6) {
        return { valid: false, error: 'First digit must be between 2 and 6' };
    }

    const sum = WEIGHTS.reduce((acc, w, i) => acc + parseInt(digits[i], 10) * w, 0);
    if (sum % 10 !== parseInt(digits[8], 10)) {
        return { valid: false, error: 'Invalid Medicare number' };
    }

    if (parseInt(digits[9], 10) === 0) {
        return { valid: false, error: 'Invalid issue number' };
    }

    return { valid: true };
}

/**
 * Validates Australian Mobile (04XXXXXXXX or +614XXXXXXXX)
 */
export function validateAustralianMobile(phone: string): boolean {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    return /^(\+?61|0)4\d{8}$/.test(cleaned);
}

/**
 * Validates Australian Postcode (4 digits: 0200-9999)
 */
export function validateAustralianPostcode(postcode: string): boolean {
    const cleaned = postcode.trim();
    return /^\d{4}$/.test(cleaned);
}

/**
 * Validates IRN (Single digit 1-9)
 */
export function validateMedicareIrn(irn: string): boolean {
    return /^[1-9]$/.test(irn.trim());
}

/**
 * Validates Medicare Expiry (MM/YYYY)
 */
export function validateMedicareExpiry(expiry: string): boolean {
    return /^(0[1-9]|1[0-2])\/\d{4}$/.test(expiry.trim());
}

/**
 * Validates age >= 18
 */
export function validateAge18OrOlder(dateString: string): boolean {
    if (!dateString) return false;
    const dob = new Date(dateString);
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age >= 18;
}
