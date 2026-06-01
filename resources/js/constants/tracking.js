export const TRACKING_SESSION_KEY = 'memoforia_tracking';

export const RENTAL_TRACKING_SESSION_KEY = `${TRACKING_SESSION_KEY}_RENTAL`;

/**
 * Detect tracking type from guest reference code prefix.
 * @returns {'booking'|'rental'|null}
 */
export function detectTrackingType(code) {
    const normalized = String(code || '').trim().toUpperCase();

    if (normalized.startsWith('RENT-')) {
        return 'rental';
    }

    if (normalized.startsWith('MEMO-')) {
        return 'booking';
    }

    return null;
}

export function getTrackingTypeLabel(type) {
    return type === 'rental' ? 'Sewa Peralatan' : 'Booking Booth';
}
