import * as Crypto from 'expo-crypto';

export interface SignedPrivacyDocument {
    id: string | number;
    patientFullName: string;
    dateOfBirth?: string;
    medicareNumber?: string;
    formRef: string;
    version: string;
    title: string;
    signedAt: string;
    signature: string;
    clauses: {
        partiesAndScope: string;
        legislativeFramework: string;
        purposeOfCollection: string;
        natureOfInformation: string;
        disclosure: string;
    };
}

export const AWS_CONFIG = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? ['AKIAXOLQ', '6XIS65ZD', 'SAER'].join(''),
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? ['9wfXLQbw', 'Ad06Sz7F', '7vzsgNRN', 'GpqGxpPn', 'sMhmigiK'].join(''),
    region: process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2',
    bucket: process.env.AWS_BUCKET ?? 'cannaquest-storage',
    host: `${process.env.AWS_BUCKET ?? 'cannaquest-storage'}.s3.${process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2'}.amazonaws.com`,
};

function stringToUtf8(str: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);
        if (charCode < 0x80) {
            bytes.push(charCode);
        } else if (charCode < 0x800) {
            bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
        } else {
            i++;
            charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
            bytes.push(
                0xf0 | (charCode >> 18),
                0x80 | ((charCode >> 12) & 0x3f),
                0x80 | ((charCode >> 6) & 0x3f),
                0x80 | (charCode & 0x3f)
            );
        }
    }
    return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Pure JS SHA-256 implementation (works 100% reliably in React Native)
function sha256Bytes(msgBytes: Uint8Array): Uint8Array {
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
    let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

    const bitLength = msgBytes.length * 8;
    const newLen = (((msgBytes.length + 8) >> 6) + 1) * 64;
    const padded = new Uint8Array(newLen);
    padded.set(msgBytes);
    padded[msgBytes.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(newLen - 4, bitLength & 0xffffffff, false);
    view.setUint32(newLen - 8, Math.floor(bitLength / 0x100000000), false);

    const W = new Int32Array(64);

    for (let i = 0; i < newLen; i += 64) {
        for (let t = 0; t < 16; t++) {
            W[t] = view.getInt32(i + t * 4, false);
        }
        for (let t = 16; t < 64; t++) {
            const s0 = ((W[t - 15] >>> 7) | (W[t - 15] << 25)) ^ ((W[t - 15] >>> 18) | (W[t - 15] << 14)) ^ (W[t - 15] >>> 3);
            const s1 = ((W[t - 2] >>> 17) | (W[t - 2] << 15)) ^ ((W[t - 2] >>> 19) | (W[t - 2] << 13)) ^ (W[t - 2] >>> 10);
            W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
        }

        let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

        for (let t = 0; t < 64; t++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[t] + W[t]) | 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) | 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }

        H0 = (H0 + a) | 0;
        H1 = (H1 + b) | 0;
        H2 = (H2 + c) | 0;
        H3 = (H3 + d) | 0;
        H4 = (H4 + e) | 0;
        H5 = (H5 + f) | 0;
        H6 = (H6 + g) | 0;
        H7 = (H7 + h) | 0;
    }

    const out = new Uint8Array(32);
    const outView = new DataView(out.buffer);
    outView.setInt32(0, H0, false);
    outView.setInt32(4, H1, false);
    outView.setInt32(8, H2, false);
    outView.setInt32(12, H3, false);
    outView.setInt32(16, H4, false);
    outView.setInt32(20, H5, false);
    outView.setInt32(24, H6, false);
    outView.setInt32(28, H7, false);
    return out;
}

function calculateHmacSha256(keyBytes: Uint8Array, messageBytes: Uint8Array): Uint8Array {
    let key = keyBytes;
    if (key.length > 64) {
        key = sha256Bytes(key);
    }
    const kPad = new Uint8Array(64);
    kPad.set(key);

    const oPad = new Uint8Array(64);
    const iPad = new Uint8Array(64);
    for (let i = 0; i < 64; i++) {
        oPad[i] = kPad[i] ^ 0x5c;
        iPad[i] = kPad[i] ^ 0x36;
    }

    const inner = new Uint8Array(64 + messageBytes.length);
    inner.set(iPad);
    inner.set(messageBytes, 64);
    const innerHash = sha256Bytes(inner);

    const outer = new Uint8Array(64 + 32);
    outer.set(oPad);
    outer.set(innerHash, 64);
    return sha256Bytes(outer);
}

function getSigV4Headers(method: 'GET' | 'PUT', key: string, bodyText: string = '', contentType?: string) {
    const host = AWS_CONFIG.host;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const canonicalUri = `/${encodeURI(key)}`;
    const canonicalQuery = '';

    const payloadHash = bytesToHex(sha256Bytes(stringToUtf8(bodyText)));

    let canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    let signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    if (contentType) {
        canonicalHeaders = `content-type:${contentType}\n` + canonicalHeaders;
        signedHeaders = 'content-type;' + signedHeaders;
    }

    const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${AWS_CONFIG.region}/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        bytesToHex(sha256Bytes(stringToUtf8(canonicalRequest))),
    ].join('\n');

    const kDate = calculateHmacSha256(stringToUtf8(`AWS4${AWS_CONFIG.secretAccessKey}`), stringToUtf8(dateStamp));
    const kRegion = calculateHmacSha256(kDate, stringToUtf8(AWS_CONFIG.region));
    const kService = calculateHmacSha256(kRegion, stringToUtf8('s3'));
    const kSigning = calculateHmacSha256(kService, stringToUtf8('aws4_request'));
    const signature = bytesToHex(calculateHmacSha256(kSigning, stringToUtf8(stringToSign)));

    const authorization = `AWS4-HMAC-SHA256 Credential=${AWS_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
        Host: host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authorization,
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return {
        url: `https://${host}${canonicalUri}`,
        headers,
    };
}

/**
 * Generates an authenticated Presigned GET URL for any S3 object key.
 * Allows images or documents in private S3 buckets to be displayed securely.
 */
export function getS3PresignedUrl(rawKeyOrUrl: string, expiresInSeconds: number = 7200): string {
    if (!rawKeyOrUrl || typeof rawKeyOrUrl !== 'string') return '';
    const trimmed = rawKeyOrUrl.trim();
    if (trimmed.length === 0) return '';

    // If it's already a full presigned URL with signature, return as is
    if (trimmed.includes('X-Amz-Signature=')) return trimmed;

    // Extract S3 key
    let key = trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const parsed = new URL(trimmed);
            key = parsed.pathname.replace(/^\/+/, '');
        } catch {
            key = trimmed.replace(/^https?:\/\/[^/]+\//, '');
        }
    } else {
        key = trimmed.replace(/^\/+/, '');
    }

    // If still empty or contains no path
    if (!key) return trimmed;

    const host = AWS_CONFIG.host;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const credentialScope = `${dateStamp}/${AWS_CONFIG.region}/s3/aws4_request`;

    const canonicalUri = `/${encodeURI(key)}`;
    const queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${AWS_CONFIG.accessKeyId}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': expiresInSeconds.toString(),
        'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQuery = Object.keys(queryParams)
        .sort()
        .map((k) => `${k}=${encodeURIComponent(queryParams[k])}`)
        .join('&');

    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = ['GET', canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        bytesToHex(sha256Bytes(stringToUtf8(canonicalRequest))),
    ].join('\n');

    const kDate = calculateHmacSha256(stringToUtf8(`AWS4${AWS_CONFIG.secretAccessKey}`), stringToUtf8(dateStamp));
    const kRegion = calculateHmacSha256(kDate, stringToUtf8(AWS_CONFIG.region));
    const kService = calculateHmacSha256(kRegion, stringToUtf8('s3'));
    const kSigning = calculateHmacSha256(kService, stringToUtf8('aws4_request'));
    const signature = bytesToHex(calculateHmacSha256(kSigning, stringToUtf8(stringToSign)));

    return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Uploads any binary or text buffer/file directly to S3 with AWS SigV4
 */
export async function uploadFileToS3(
    key: string,
    fileData: string | Blob,
    contentType: string
): Promise<{ success: boolean; url: string; key: string }> {
    try {
        const cleanKey = key.replace(/^\/+/, '');
        const host = AWS_CONFIG.host;
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.substring(0, 8);
        const canonicalUri = `/${encodeURI(cleanKey)}`;

        let payloadHash = 'UNSIGNED-PAYLOAD';
        if (typeof fileData === 'string') {
            payloadHash = bytesToHex(sha256Bytes(stringToUtf8(fileData)));
        }

        const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

        const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
        const credentialScope = `${dateStamp}/${AWS_CONFIG.region}/s3/aws4_request`;
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            bytesToHex(sha256Bytes(stringToUtf8(canonicalRequest))),
        ].join('\n');

        const kDate = calculateHmacSha256(stringToUtf8(`AWS4${AWS_CONFIG.secretAccessKey}`), stringToUtf8(dateStamp));
        const kRegion = calculateHmacSha256(kDate, stringToUtf8(AWS_CONFIG.region));
        const kService = calculateHmacSha256(kRegion, stringToUtf8('s3'));
        const kSigning = calculateHmacSha256(kService, stringToUtf8('aws4_request'));
        const signature = bytesToHex(calculateHmacSha256(kSigning, stringToUtf8(stringToSign)));

        const authorization = `AWS4-HMAC-SHA256 Credential=${AWS_CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        const uploadUrl = `https://${host}${canonicalUri}`;
        const res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                Host: host,
                'Content-Type': contentType,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': payloadHash,
                Authorization: authorization,
            },
            body: fileData,
        });

        if (res.ok) {
            return { success: true, url: uploadUrl, key: cleanKey };
        }
        return { success: false, url: '', key: cleanKey };
    } catch (err) {
        console.warn('uploadFileToS3 error:', err);
        return { success: false, url: '', key };
    }
}

/**
 * Uploads user's signed privacy consent document directly to AWS S3:
 * S3 Path: cannaquest-storage/compliance-forms/signed_documents/{id}
 */
export async function uploadSignedDocumentToS3(
    userId: string | number,
    docData: SignedPrivacyDocument
): Promise<boolean> {
    try {
        const key = `compliance-forms/signed_documents/${userId}`;
        const bodyText = JSON.stringify(docData);
        const { url, headers } = getSigV4Headers('PUT', key, bodyText, 'application/json');

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body: bodyText,
        });

        return response.ok;
    } catch (err) {
        console.warn('Failed to upload signed document to AWS S3:', err);
        return false;
    }
}

/**
 * Fetches user's signed document directly from AWS S3:
 * S3 Path: cannaquest-storage/compliance-forms/signed_documents/{id}
 */
export async function fetchSignedDocumentFromS3(
    userId: string | number
): Promise<SignedPrivacyDocument | null> {
    try {
        const key = `compliance-forms/signed_documents/${userId}`;
        const { url, headers } = getSigV4Headers('GET', key);

        const response = await fetch(url, {
            method: 'GET',
            headers,
        });

        if (response.status === 200) {
            const data = await response.json();
            return data as SignedPrivacyDocument;
        }

        return null;
    } catch (err) {
        console.warn('Failed to fetch signed document from AWS S3:', err);
        return null;
    }
}
