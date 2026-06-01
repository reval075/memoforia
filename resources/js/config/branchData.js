/**
 * Kalaswara - MemoForia Photobox Partner Location
 *
 * Informasi lokasi partner tempat photobox MemoForia tersedia.
 * Kalaswara adalah coffee shop yang menyediakan ruang untuk photobox experience.
 *
 * Data diambil dari: https://maps.app.goo.gl/tNcMd668UzGufKCy6
 */

export const branchConfig = {
    name: 'Kalaswara',
    address: 'Jl. Babakan Jati No.44, Gumuruh',
    city: 'Bandung',
    province: 'Jawa Barat',
    postalCode: '40275',

    // Contact Information
    phone: '(+62) 22-XXXX-XXXX',  // Nomor Kalaswara Coffee Shop
    whatsapp: '+62812-XXXX-XXXX',  // WhatsApp untuk booking photobox
    email: 'kalaswara@email.com',   // Email kontak Kalaswara

    // Operating Hours
    operatingHours: 'Senin - Minggu, 10:00 - 22:00 WIB',

    // Description
    description: 'MemoForia bekerja sama dengan Kalaswara Coffee & Space untuk menghadirkan layanan photobox yang dapat digunakan langsung oleh pengunjung.',

    // Google Maps
    mapsLink: 'https://maps.app.goo.gl/tNcMd668UzGufKCy6',
    latitude: -6.9328405,
    longitude: 107.6347885,

    // Image (dapat diisi dengan URL atau path gambar lokal)
    image: '/images/branch-kalaswara.jpg',  // Update dengan path gambar sesungguhnya
};

/**
 * Helper function untuk membuka WhatsApp
 */
export function openWhatsApp(message = 'Halo Kalaswara, saya tertarik untuk booking photobox MemoForia. Berapa harga dan ketersediaan waktu?') {
    const phoneNumber = branchConfig.whatsapp.replace(/\D/g, ''); // Remove non-digits
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
}

/**
 * Helper function untuk membuka Google Maps
 */
export function openGoogleMaps() {
    window.open(branchConfig.mapsLink, '_blank');
}

/**
 * Helper function untuk mengirim email
 */
export function sendEmail(subject = 'Inquiry') {
    window.location.href = `mailto:${branchConfig.email}?subject=${encodeURIComponent(subject)}`;
}
