<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\Illuminate\Support\Facades\DB::table('addons')->truncate();
\App\Models\Addon::create(['name' => 'Keychain 10 pcs', 'price' => 50000, 'description' => '', 'is_active' => true]);
\App\Models\Addon::create(['name' => 'Custom Background', 'price' => 400000, 'description' => '', 'is_active' => true]);

echo "Addons cleaned up.\n";
