<?php

namespace Database\Seeders;

use App\Models\Addon;
use App\Models\Availability;
use App\Models\Booth;
use App\Models\Branch;
use App\Models\Package;
use App\Models\PhotoTemplate;
use App\Models\RentalEquipment;
use App\Models\ServicePackage;
use App\Models\PackageVariant;
use App\Models\UnavailableDate;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MemoforiaDummyDataSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@memoforia.com'],
            [
                'name' => 'Admin Memoforia',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        $this->seedBranches();
        $this->seedBoothPackages();
        $this->seedServicePackages();
        $this->seedAddons();
        $this->seedPhotoTemplates();
        $this->seedRentalEquipments();
        $this->seedAvailabilities();
        $this->seedUnavailableDates();
    }

    protected function seedBranches(): void
    {
        $branches = [
            [
                'name' => 'Kalaswara',
                'address' => 'Jl. Babakan Jati No.44, Gumuruh',
                'city' => 'Bandung',
                'province' => 'Jawa Barat',
                'postal_code' => '40275',
                'phone' => '(022) XXXX-XXXX',  // Nomor Kalaswara Coffee Shop
                'email' => 'kalaswara@email.com',  // Email Kalaswara Coffee Shop
                'whatsapp_number' => '+62812-XXXX-XXXX',  // WhatsApp untuk booking
                'maps_link' => 'https://maps.app.goo.gl/tNcMd668UzGufKCy6',
                'latitude' => -6.9328405,
                'longitude' => 107.6347885,
                'operating_hours' => 'Senin - Minggu, 10:00 - 22:00 WIB',
                'image' => 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=800&q=80',
                'description' => 'Kalaswara adalah coffee shop dan creative space yang menjadi partner MemoForia. Pengunjung dapat menikmati pengalaman photobox premium MemoForia di lokasi ini sambil merasakan suasana nyaman dari Kalaswara. Hubungi kami untuk booking dan informasi paket yang tersedia.',
            ],
        ];

        foreach ($branches as $data) {
            $branch = Branch::updateOrCreate(
                ['name' => $data['name']],
                array_merge($data, ['is_active' => true])
            );

            $booths = [
                ['name' => 'Booth Vintage Gold', 'status' => 'active'],
                ['name' => 'Booth Neon Dreams', 'status' => 'active'],
                ['name' => 'Booth Editorial White', 'status' => 'active'],
            ];

            foreach ($booths as $booth) {
                Booth::updateOrCreate(
                    ['branch_id' => $branch->id, 'name' => $booth['name']],
                    $booth
                );
            }
        }
    }

    protected function seedBoothPackages(): void
    {
        $packages = [
            [
                'name' => 'Paket Snap 15',
                'price' => 75000,
                'duration' => '15 Menit',
                'description' => '2 lembar cetak 4R + softcopy via email. Cocok untuk quick session.',
            ],
            [
                'name' => 'Paket Classic 30',
                'price' => 125000,
                'duration' => '30 Menit',
                'description' => '4 lembar cetak strip 2x6 + softcopy + 1 GIF boomerang.',
            ],
            [
                'name' => 'Paket Premium 60',
                'price' => 199000,
                'duration' => '60 Menit',
                'description' => '8 lembar cetak + unlimited softcopy + custom frame digital + GIF.',
            ],
            [
                'name' => 'Paket Couple Story',
                'price' => 249000,
                'duration' => '45 Menit',
                'description' => '6 lembar cetak + 1 frame kolase 4R + props romantis included.',
            ],
        ];

        foreach ($packages as $pkg) {
            Package::updateOrCreate(['name' => $pkg['name']], $pkg);
        }
    }

    protected function seedServicePackages(): void
    {
        $catalog = [
            [
                'name' => 'Soft File Only',
                'category' => 'soft_file',
                'description' => 'Sesi foto tanpa cetak fisik. Semua file resolusi tinggi dikirim via link digital dalam 24 jam.',
                'variants' => [
                    ['name' => '1 Jam Session', 'duration_hours' => 1, 'price' => 750000, 'extra_hour_price' => 350000, 'is_unlimited' => true],
                    ['name' => '2 Jam Session', 'duration_hours' => 2, 'price' => 1200000, 'extra_hour_price' => 300000, 'is_unlimited' => true],
                    ['name' => '4 Jam Session', 'duration_hours' => 4, 'price' => 2100000, 'extra_hour_price' => 250000, 'is_unlimited' => true],
                ],
            ],
            [
                'name' => 'Basic Unlimited Print',
                'category' => 'unlimited_print',
                'description' => 'Cetak foto sepuasnya selama durasi sesi. Layout strip klasik, crew standar, backdrop basic.',
                'variants' => [
                    ['name' => '2 Jam Unlimited', 'duration_hours' => 2, 'price' => 1800000, 'extra_hour_price' => 500000, 'is_unlimited' => true],
                    ['name' => '3 Jam Unlimited', 'duration_hours' => 3, 'price' => 2400000, 'extra_hour_price' => 450000, 'is_unlimited' => true],
                    ['name' => '5 Jam Unlimited', 'duration_hours' => 5, 'price' => 3800000, 'extra_hour_price' => 400000, 'is_unlimited' => true],
                ],
            ],
            [
                'name' => 'Premium Unlimited Print',
                'category' => 'unlimited_print',
                'description' => 'Cetak unlimited kualitas premium, kustom frame, lighting profesional, 2 crew dedicated.',
                'variants' => [
                    ['name' => '3 Jam Premium', 'duration_hours' => 3, 'price' => 3500000, 'extra_hour_price' => 800000, 'is_unlimited' => true],
                    ['name' => '5 Jam Premium', 'duration_hours' => 5, 'price' => 5200000, 'extra_hour_price' => 750000, 'is_unlimited' => true],
                ],
            ],
            [
                'name' => 'Limited Prints',
                'category' => 'limited_print',
                'description' => 'Paket dengan kuota cetak tetap. Ideal untuk gathering kecil & acara perusahaan.',
                'variants' => [
                    ['name' => '100 Lembar', 'print_limit' => 100, 'price' => 1500000, 'is_unlimited' => false],
                    ['name' => '200 Lembar', 'print_limit' => 200, 'price' => 2200000, 'is_unlimited' => false],
                    ['name' => '350 Lembar', 'print_limit' => 350, 'price' => 3100000, 'is_unlimited' => false],
                ],
            ],
            [
                'name' => 'Wedding Photobooth',
                'category' => 'event',
                'description' => 'Paket lengkap pernikahan: unlimited print 4 jam, guest book digital, backdrop custom, 3 crew.',
                'variants' => [
                    ['name' => 'Silver (3 Jam)', 'duration_hours' => 3, 'price' => 4500000, 'extra_hour_price' => 900000, 'is_unlimited' => true],
                    ['name' => 'Gold (5 Jam)', 'duration_hours' => 5, 'price' => 6500000, 'extra_hour_price' => 850000, 'is_unlimited' => true],
                    ['name' => 'Platinum (8 Jam)', 'duration_hours' => 8, 'price' => 9500000, 'extra_hour_price' => 800000, 'is_unlimited' => true],
                ],
            ],
            [
                'name' => 'Corporate & Brand Activation',
                'category' => 'event',
                'description' => 'Photobooth branded untuk product launch, expo, dan activations. Termasuk overlay logo & data capture.',
                'variants' => [
                    ['name' => 'Half Day (4 Jam)', 'duration_hours' => 4, 'price' => 5500000, 'is_unlimited' => true],
                    ['name' => 'Full Day (8 Jam)', 'duration_hours' => 8, 'price' => 8900000, 'is_unlimited' => true],
                ],
            ],
        ];

        foreach ($catalog as $item) {
            $variants = $item['variants'];
            unset($item['variants']);

            $package = ServicePackage::updateOrCreate(
                ['name' => $item['name']],
                array_merge($item, ['is_active' => true])
            );

            foreach ($variants as $variant) {
                PackageVariant::updateOrCreate(
                    [
                        'service_package_id' => $package->id,
                        'name' => $variant['name'],
                    ],
                    $variant
                );
            }
        }
    }

    protected function seedAddons(): void
    {
        $addons = [
            ['name' => 'Gantungan Kunci Akrilik', 'description' => 'Keychain akrilik bening per pcs, sisipkan mini foto.', 'price' => 10000],
            ['name' => 'Custom Backdrop', 'description' => 'Backdrop digital & fisik disesuaikan tema acara.', 'price' => 500000],
            ['name' => 'Extra 1 Hour', 'description' => 'Perpanjangan operational photobooth 1 jam.', 'price' => 400000],
            ['name' => 'Props Premium Set', 'description' => '50+ props tematik (party, wedding, corporate).', 'price' => 350000],
            ['name' => 'Live Slideshow Screen', 'description' => 'Layar 43" menampilkan foto tamu secara live.', 'price' => 750000],
            ['name' => 'Crew Tambahan', 'description' => '1 operator tambahan untuk event ramai.', 'price' => 300000],
            ['name' => 'Green Screen Setup', 'description' => 'Background digital interchangeable + 5 preset scene.', 'price' => 600000],
        ];

        foreach ($addons as $addon) {
            Addon::updateOrCreate(['name' => $addon['name']], array_merge($addon, ['is_active' => true]));
        }
    }

    protected function seedPhotoTemplates(): void
    {
        $templates = [
            [
                'name'          => 'Classic 2x6 Strip',
                'size'          => '2x6',
                'frame_type'    => 'Classic',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-01.png',
            ],
            [
                'name'          => 'Modern 4R Grid',
                'size'          => '4R',
                'frame_type'    => 'Minimalist',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-02.png',
            ],
            [
                'name'          => 'Elegant Single 4R',
                'size'          => '4R',
                'frame_type'    => 'Vintage',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-04.png',
            ],
            [
                'name'          => 'Wedding Floral Frame',
                'size'          => '4R',
                'frame_type'    => 'Floral',
                'layout_type'   => '2-Row Landscape Strip',
                'preview_image' => '/images/templates/template-05.jpg',
            ],
            [
                'name'          => 'Corporate Clean Strip',
                'size'          => '2x6',
                'frame_type'    => 'Corporate',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-03.jpg',
            ],
            [
                'name'          => 'Polaroid Style',
                'size'          => '3.5x4.25',
                'frame_type'    => 'Polaroid',
                'layout_type'   => 'Single with Caption',
                'preview_image' => null,
            ],
        ];

        foreach ($templates as $tpl) {
            PhotoTemplate::updateOrCreate(
                ['name' => $tpl['name']],
                array_merge($tpl, ['is_active' => true])
            );
        }
    }

    protected function seedRentalEquipments(): void
    {
        $equipments = [
            ['name' => 'Canon EOS R5 Body', 'category' => 'Kamera', 'stock' => 2, 'price_per_day' => 350000, 'description' => 'Mirrorless full-frame 45MP, cocok studio & event.'],
            ['name' => 'Sony A7 IV Body', 'category' => 'Kamera', 'stock' => 2, 'price_per_day' => 320000, 'description' => 'Hybrid photo/video, low-light excellent.'],
            ['name' => 'Sony FE 50mm f/1.8', 'category' => 'Lensa', 'stock' => 4, 'price_per_day' => 100000, 'description' => 'Prime lens portrait classic.'],
            ['name' => 'Canon RF 24-70mm f/2.8', 'category' => 'Lensa', 'stock' => 2, 'price_per_day' => 275000, 'description' => 'Zoom serba guna profesional.'],
            ['name' => 'Godox SL-60W x2 Kit', 'category' => 'Lighting', 'stock' => 5, 'price_per_day' => 150000, 'description' => 'Continuous LED untuk foto & video.'],
            ['name' => 'Godox AD200 Pro Flash', 'category' => 'Lighting', 'stock' => 3, 'price_per_day' => 200000, 'description' => 'Strobe portable outdoor/indoor.'],
            ['name' => 'Manfrotto Tripod Pro', 'category' => 'Aksesoris', 'stock' => 6, 'price_per_day' => 75000, 'description' => 'Tripod aluminium heavy duty.'],
            ['name' => 'Seamless Backdrop Kit', 'category' => 'Studio', 'stock' => 4, 'price_per_day' => 120000, 'description' => 'Backdrop putih, abu, hitam + stand.'],
        ];

        foreach ($equipments as $eq) {
            RentalEquipment::updateOrCreate(
                ['name' => $eq['name']],
                array_merge($eq, ['status' => 'available'])
            );
        }
    }

    protected function seedAvailabilities(): void
    {
        $booths = Booth::where('status', 'active')->get();
        if ($booths->isEmpty()) {
            return;
        }

        $slots = [
            ['10:00:00', '11:00:00'],
            ['11:00:00', '12:00:00'],
            ['13:00:00', '14:00:00'],
            ['14:00:00', '15:00:00'],
            ['15:00:00', '16:00:00'],
            ['16:00:00', '17:00:00'],
            ['18:00:00', '19:00:00'],
        ];

        foreach ($booths as $booth) {
            for ($d = 0; $d < 14; $d++) {
                $date = Carbon::today()->addDays($d)->format('Y-m-d');
                foreach ($slots as $slot) {
                    Availability::updateOrCreate(
                        [
                            'booth_id' => $booth->id,
                            'date' => $date,
                            'start_time' => $slot[0],
                        ],
                        [
                            'end_time' => $slot[1],
                            'status' => 'available',
                        ]
                    );
                }
            }
        }
    }

    protected function seedUnavailableDates(): void
    {
        $dates = [
            Carbon::today()->addDays(3)->format('Y-m-d'),
            Carbon::today()->addDays(10)->format('Y-m-d'),
        ];

        foreach ($dates as $date) {
            UnavailableDate::updateOrCreate(
                ['date' => $date],
                ['reason' => 'Maintenance studio / fully booked']
            );
        }
    }
}
