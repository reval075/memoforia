/**
 * Homepage image paths — real Memoforia photobooth assets.
 * All images are locally hosted PNG files from generated photobooth shoots.
 * Unsplash fallback only for event-rental (equipment photography).
 */

export const homeImages = {
    hero: '/images/strips/strip-01.png',
    philosophy: '/images/events/event-studio.png',
    photobooth: '/images/events/event-booth.png',
    rental: 'https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?auto=format&fit=crop&w=800&q=85',
    strips: [
        { src: '/images/strips/strip-01.png', alt: 'Korean Style Photostrip — Memoforia', rotate: -8 },
        { src: '/images/strips/strip-02.png', alt: 'Cute Pastel Photostrip — Memoforia', rotate: 6 },
        { src: '/images/strips/strip-03.png', alt: 'Vintage Film Photostrip — Memoforia', rotate: -4 },
        { src: '/images/strips/strip-04.png', alt: 'Retro 90s Photostrip — Memoforia', rotate: 10 },
    ],
};

/** Gallery photos — real Memoforia photobooth prints */
export const galleryPhotos = [
    {
        src: '/images/gallery/gallery-01.png',
        fallback: '/images/gallery/gallery-01.png',
        alt: 'Birthday Party Photobooth — Memoforia',
    },
    {
        src: '/images/gallery/gallery-02.png',
        fallback: '/images/gallery/gallery-02.png',
        alt: 'Wedding Photobooth — Memoforia',
    },
    {
        src: '/images/gallery/gallery-03.png',
        fallback: '/images/gallery/gallery-03.png',
        alt: 'Fun Props Photobooth Session — Memoforia',
    },
    {
        src: '/images/gallery/gallery-04.png',
        fallback: '/images/gallery/gallery-04.png',
        alt: 'Group Photobooth Session — Memoforia',
    },
    {
        src: '/images/gallery/gallery-05.png',
        fallback: '/images/gallery/gallery-05.png',
        alt: 'Students Photobooth Session — Memoforia',
    },
];
