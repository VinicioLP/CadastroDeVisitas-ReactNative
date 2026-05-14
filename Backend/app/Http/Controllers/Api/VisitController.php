<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use Illuminate\Http\Request;

class VisitController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'client_id' => ['required'],
            'location_name' => ['required', 'string', 'max:255'],
            'observation' => ['nullable', 'string'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'visit_date' => ['required', 'date'],
            'photo' => ['nullable', 'image'],
        ]);

        $existingVisit = Visit::where('user_id', $request->user()->id)
            ->where('client_id', $data['client_id'])
            ->first();

        if ($existingVisit) {
            return response()->json([
                'message' => 'Visita ja sincronizada.',
                'data' => $existingVisit,
            ]);
        }

        $photoPath = null;

        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('visits', 'public');
        }

        $visit = Visit::create([
            'user_id' => $request->user()->id,
            'client_id' => $data['client_id'],
            'location_name' => $data['location_name'],
            'observation' => $data['observation'] ?? null,
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
            'photo_uri' => $photoPath,
            'visit_date' => $data['visit_date'],
            'sync_status' => 'synced',
        ]);

        return response()->json([
            'message' => 'Visita criada.',
            'data' => $visit,
        ], 201);
    }
}
