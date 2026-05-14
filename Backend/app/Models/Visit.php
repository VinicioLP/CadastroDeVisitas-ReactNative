<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'location_name',
        'observation',
        'latitude',
        'longitude',
        'photo_uri',
        'visit_date',
        'sync_status'
    ];

    protected $casts = [
        'visit_date' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float'
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
