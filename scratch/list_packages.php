<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach (App\Models\ServicePackage::with('packageVariants')->get() as $p) {
    echo $p->id . ': ' . $p->name . ' (' . $p->category . ')' . PHP_EOL;
    foreach ($p->packageVariants as $v) {
        echo '  - ' . $v->id . ': ' . $v->name . ' (price: ' . $v->price . ', duration: ' . $v->duration_hours . ', limit: ' . $v->print_limit . ', unlimited: ' . $v->is_unlimited . ')' . PHP_EOL;
    }
}
