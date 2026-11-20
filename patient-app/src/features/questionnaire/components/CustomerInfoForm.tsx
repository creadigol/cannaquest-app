import React, { useMemo } from 'react';
import { formatMedicareExpiry } from '@/features/customer/utils/medicare-expiry';
import { CustomerInfoStep } from './CustomerInfoStep';

type Props = React.ComponentProps<typeof CustomerInfoStep>;

/** Keep the form's month/year display separate from the stored expiry date. */
export function CustomerInfoForm({ initialInfo, onSaveAndContinue, isSubmitting }: Props) {
    const displayInfo = useMemo(() => ({
        ...initialInfo,
        medicare_expiry: formatMedicareExpiry(initialInfo.medicare_expiry),
    }), [initialInfo]);

    return (
        <CustomerInfoStep
            initialInfo={displayInfo}
            isSubmitting={isSubmitting}
            onSaveAndContinue={info => onSaveAndContinue({
                ...info,
                // Preserve an explicit day/timezone when the month is unchanged.
                medicare_expiry: info.medicare_expiry.trim() === displayInfo.medicare_expiry
                    ? initialInfo.medicare_expiry
                    : info.medicare_expiry,
            })}
        />
    );
}
