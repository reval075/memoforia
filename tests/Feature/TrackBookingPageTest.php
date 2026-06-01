<?php

namespace Tests\Feature;

use Tests\TestCase;

class TrackBookingPageTest extends TestCase
{
    public function test_track_booking_lookup_page_renders(): void
    {
        $response = $this->get('/track-booking');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('TrackBooking'));
    }

    public function test_track_booking_detail_page_renders(): void
    {
        $response = $this->get('/track-booking/detail');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('TrackBookingDetail'));
    }

    public function test_track_rental_redirects_to_unified_track_booking(): void
    {
        $response = $this->get('/track-rental?code=RENT-20260601-TEST1');

        $response->assertRedirect('/track-booking?code=RENT-20260601-TEST1');
    }
}
