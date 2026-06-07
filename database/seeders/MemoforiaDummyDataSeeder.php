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
use Illuminate\Support\Facades\Schema;

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
                'name' => 'PACKAGE HEMAT',
                'category' => 'hemat',
                'description' => 'Paket ekonomis yang sangat cocok untuk dokumentasi digital. Dapatkan akses file foto digital berkualitas tinggi sepuasnya tanpa cetak fisik.',
                'display_order' => 1,
                'has_softfile' => true,
                'has_prints' => false,
                'has_qrcode' => true,
                'has_gif' => true,
                'has_custom_template' => true,
                'has_supporting_crew' => true,
                'has_tiket_antrian' => true,
                'printer_type' => null,
                'printer_description' => null,
                'variants' => [
                    ['name' => '1 Jam Session', 'duration_hours' => 1, 'price' => 300000, 'extra_hour_price' => 100000, 'is_unlimited' => true],
                    ['name' => '2 Jam Session', 'duration_hours' => 2, 'price' => 400000, 'extra_hour_price' => 100000, 'is_unlimited' => true],
                    ['name' => '3 Jam Session', 'duration_hours' => 3, 'price' => 500000, 'extra_hour_price' => 100000, 'is_unlimited' => true],
                ],
            ],
            [
                'name' => 'PACKAGE BASIC',
                'category' => 'basic',
                'description' => 'Pilihan ideal untuk meramaikan event skala kecil hingga menengah menggunakan printer inkjet standar dengan hasil cetak menawan.',
                'display_order' => 2,
                'has_softfile' => true,
                'has_prints' => true,
                'has_qrcode' => true,
                'has_gif' => true,
                'has_custom_template' => true,
                'has_supporting_crew' => true,
                'has_tiket_antrian' => true,
                'printer_type' => 'Inkjet Printer',
                'printer_description' => 'Kecepatan cetak standar, cocok untuk event kecil hingga menengah.',
                'variants' => [
                    ['name' => '1 Jam Unlimited Prints', 'duration_hours' => 1, 'price' => 500000, 'extra_hour_price' => 350000, 'is_unlimited' => true],
                    ['name' => '2 Jam Unlimited Prints', 'duration_hours' => 2, 'price' => 950000, 'extra_hour_price' => 350000, 'is_unlimited' => true],
                    ['name' => '3 Jam Unlimited Prints', 'duration_hours' => 3, 'price' => 1300000, 'extra_hour_price' => 350000, 'is_unlimited' => true],
                    ['name' => '100 Prints Limited', 'print_limit' => 100, 'price' => 1100000, 'extra_print_price' => 500000, 'is_unlimited' => false],
                    ['name' => '200 Prints Limited', 'print_limit' => 200, 'price' => 2000000, 'extra_print_price' => 500000, 'is_unlimited' => false],
                ],
            ],
            [
                'name' => 'PACKAGE PREMIUM',
                'category' => 'premium',
                'description' => 'Layanan kelas atas untuk event berskala besar. Cetak instan super cepat menggunakan Thermal Printer berdaya tahan tinggi serta hasil super tajam.',
                'display_order' => 3,
                'has_softfile' => true,
                'has_prints' => true,
                'has_qrcode' => true,
                'has_gif' => true,
                'has_custom_template' => true,
                'has_supporting_crew' => true,
                'has_tiket_antrian' => true,
                'printer_type' => 'Thermal Printer',
                'printer_description' => 'Cetak sangat cepat, hasil lebih tajam, lebih tahan lama, cocok untuk event besar.',
                'variants' => [
                    ['name' => '1 Jam Unlimited Prints', 'duration_hours' => 1, 'price' => 699000, 'extra_hour_price' => 500000, 'is_unlimited' => true],
                    ['name' => '2 Jam Unlimited Prints', 'duration_hours' => 2, 'price' => 1200000, 'extra_hour_price' => 500000, 'is_unlimited' => true],
                    ['name' => '3 Jam Unlimited Prints', 'duration_hours' => 3, 'price' => 1480000, 'extra_hour_price' => 500000, 'is_unlimited' => true],
                    ['name' => '100 Prints Limited', 'print_limit' => 100, 'price' => 1600000, 'extra_print_price' => 500000, 'is_unlimited' => false],
                    ['name' => '200 Prints Limited', 'print_limit' => 200, 'price' => 2300000, 'extra_print_price' => 500000, 'is_unlimited' => false],
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

            // Clean up existing variants to avoid duplicate old variants
            $package->packageVariants()->delete();

            foreach ($variants as $variant) {
                PackageVariant::create(
                    array_merge($variant, ['service_package_id' => $package->id])
                );
            }
        }
    }

    protected function seedAddons(): void
    {
        // Delete all old addons
        Schema::disableForeignKeyConstraints();
        Addon::truncate();
        Schema::enableForeignKeyConstraints();

        $addons = [
            [
                'name' => 'Keychain 10 pcs',
                'description' => 'Gantungan kunci akrilik custom sebanyak 10 buah, cocok untuk buah tangan tamu.',
                'price' => 50000,
                'display_order' => 1
            ],
            [
                'name' => 'Custom Background',
                'description' => 'Latar belakang studio fisik/digital khusus yang didesain sesuai dengan tema acara Anda.',
                'price' => 400000,
                'display_order' => 2
            ],
        ];

        foreach ($addons as $addon) {
            Addon::create(array_merge($addon, ['is_active' => true]));
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
                'description'   => 'Desain strip klasik gaya retro film dengan 4 frame vertikal.',
                'display_order' => 1,
            ],
            [
                'name'          => 'Modern 4R Grid',
                'size'          => '4R',
                'frame_type'    => 'Minimalist',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-02.png',
                'description'   => 'Gaya minimalis modern layout grid untuk hasil cetakan 4R premium.',
                'display_order' => 2,
            ],
            [
                'name'          => 'Elegant Single 4R',
                'size'          => '4R',
                'frame_type'    => 'Vintage',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-04.png',
                'description'   => 'Frame tunggal elegan dengan sentuhan artistik vintage.',
                'display_order' => 3,
            ],
            [
                'name'          => 'Wedding Floral Frame',
                'size'          => '4R',
                'frame_type'    => 'Floral',
                'layout_type'   => '2-Row Landscape Strip',
                'preview_image' => '/images/templates/template-05.jpg',
                'description'   => 'Frame bermotif floral romantis, sangat cocok untuk dokumentasi pernikahan.',
                'display_order' => 4,
            ],
            [
                'name'          => 'Corporate Clean Strip',
                'size'          => '2x6',
                'frame_type'    => 'Corporate',
                'layout_type'   => '4-Grid Vertical Strip',
                'preview_image' => '/images/templates/template-03.jpg',
                'description'   => 'Tampilan bersih, formal, dan profesional dengan ruang custom logo perusahaan.',
                'display_order' => 5,
            ],
            [
                'name'          => 'Polaroid Style',
                'size'          => '3.5x4.25',
                'frame_type'    => 'Polaroid',
                'layout_type'   => 'Single with Caption',
                'preview_image' => null,
                'description'   => 'Gaya klasik retro Polaroid dengan frame putih ikonik dan area catatan di bagian bawah.',
                'display_order' => 6,
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
