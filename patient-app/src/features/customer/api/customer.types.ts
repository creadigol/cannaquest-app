export type CustomerAddress = {
    line1: string;
    line2: string;
    suburb: string;
    state: string;
    postcode: string;
};

export type Customer = {
    id?: number | string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    medicareNumber: string | null;
    medicareIrn: string | null;
    medicareExpiry: string | null;
    signature: string | null;
    clinicId: string | null;
    halaxyPatientId: string | null;
    isReturningPatient: boolean;
    preferredDispenserId: string | null;
    address: CustomerAddress | null;
};

export type UpdateProfileDto = {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    medicareNumber?: string | null;
    medicareIrn?: string | null;
    medicareExpiry?: string | null;
};

export type UpdateAddressDto = {
    addrLine1: string;
    addrLine2?: string;
    addrSuburb: string;
    addrState: 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT';
    addrPostcode: string;
};

export type SaveSignatureDto = {
    signatureData: string;
};

export type ComplianceDocument = {
    id: string | number;
    title: string;
    type?: {
        name: string;
        key?: string;
    };
    signedAt?: string;
    createdAt?: string;
    fileName?: string;
    fileUrl?: string;
};

export type PaymentMethod = {
    id: string | number;
    brand: 'visa' | 'mastercard' | 'amex' | string;
    last4: string;
    expMonth: number | string;
    expYear: number | string;
    isDefault?: boolean;
};
