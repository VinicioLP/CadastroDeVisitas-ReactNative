# Sistema de Sync Offline — React Native + Laravel

## Objetivo

Permitir que o aplicativo funcione mesmo sem internet.

O usuário poderá:

- marcar localização no mapa
- tirar foto
- salvar visita offline
- sincronizar automaticamente quando a internet voltar

---

# Arquitetura

```txt
React Native
   ↓
AsyncStorage
   ↓
Fila de sincronização
   ↓
NetInfo detecta internet
   ↓
Laravel API
   ↓
Banco de dados
```

---

# Backend Laravel

## Instalar Sanctum

```bash
composer require laravel/sanctum
```

Publicar arquivos:

```bash
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

Executar migrations:

```bash
php artisan migrate
```

---

# Migration da tabela visits

Criar migration:

```bash
php artisan make:migration create_visits_table
```

## database/migrations/create_visits_table.php

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visits', function (Blueprint $table) {

            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

            // evita duplicações no sync
            $table->uuid('client_id')
                ->unique();

            $table->string('title');

            $table->text('description')
                ->nullable();

            // coordenadas
            $table->decimal('latitude', 10, 7);

            $table->decimal('longitude', 10, 7);

            // imagem
            $table->string('photo_path');

            // status do sync
            $table->enum('sync_status', [
                'pending',
                'synced',
                'failed'
            ])->default('synced');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visits');
    }
};
```

---

# Model Visit

Criar model:

```bash
php artisan make:model Visit
```

## app/Models/Visit.php

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Visit extends Model
{
    protected $fillable = [
        'user_id',
        'client_id',
        'title',
        'description',
        'latitude',
        'longitude',
        'photo_path',
        'sync_status'
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
```

---

# Controller

Criar controller:

```bash
php artisan make:controller Api/VisitController
```

## app/Http/Controllers/Api/VisitController.php

```php
<?php

namespace App\Http\Controllers\Api;

use App\Models\Visit;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class VisitController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'client_id' => ['required', 'uuid'],
            'title' => ['required'],
            'latitude' => ['required', 'numeric'],
            'longitude' => ['required', 'numeric'],
            'photo' => ['required', 'image']
        ]);

        // evita duplicação
        $exists = Visit::where(
            'client_id',
            $request->client_id
        )->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Visita já sincronizada'
            ]);
        }

        // salva imagem
        $path = $request->file('photo')
            ->store('visits', 'public');

        // cria visita
        $visit = Visit::create([
            'user_id' => auth()->id(),
            'client_id' => $request->client_id,
            'title' => $request->title,
            'description' => $request->description,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'photo_path' => $path,
            'sync_status' => 'synced'
        ]);

        return response()->json([
            'message' => 'Visita criada',
            'data' => $visit
        ]);
    }
}
```

---

# Rotas da API

## routes/api.php

```php
use App\Http\Controllers\Api\VisitController;

Route::middleware('auth:sanctum')
    ->group(function () {

        Route::post(
            '/visits',
            [VisitController::class, 'store']
        );

    });
```

---

# Configurar storage

```bash
php artisan storage:link
```

---

# React Native

## Instalar dependências

```bash
npm install axios

npm install @react-native-async-storage/async-storage

npm install @react-native-community/netinfo

npm install uuid

npm install react-native-get-random-values
```

---

# Estrutura do React Native

```txt
src/
 ├── api/
 │    └── client.js
 │
 ├── services/
 │    └── syncService.js
 │
 ├── storage/
 │    └── visitStorage.js
 │
 ├── utils/
 │    └── internet.js
 │
 └── screens/
      └── MapScreen.js
```

---

# Axios configurado

## src/api/client.js

```js
import axios from 'axios';

import AsyncStorage from
    '@react-native-async-storage/async-storage';

const api = axios.create({
    baseURL: 'http://SEU_IP:8000/api'
});

api.interceptors.request.use(
    async config => {

        const token =
            await AsyncStorage.getItem('token');

        if (token) {

            config.headers.Authorization =
                `Bearer ${token}`;

        }

        return config;
    }
);

export default api;
```

---

# Salvando visita offline

## src/storage/visitStorage.js

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function saveVisitOffline(visit)
{
    const visits = JSON.parse(
        await AsyncStorage.getItem('visits')
    ) || [];

    visits.push(visit);

    await AsyncStorage.setItem(
        'visits',
        JSON.stringify(visits)
    );
}
```

---

# Criando visita offline

```js
import { v4 as uuid } from 'uuid';

const visit = {
    client_id: uuid(),
    title,
    description,
    latitude,
    longitude,
    photo_uri: imageUri,
    synced: false,
    status: 'pending'
};

await saveVisitOffline(visit);
```

---

# Serviço de sincronização

## src/services/syncService.js

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/client';

export async function syncPendingVisits()
{
    const visits = JSON.parse(
        await AsyncStorage.getItem('visits')
    ) || [];

    const pending = visits.filter(
        visit => !visit.synced
    );

    for (const visit of pending) {

        try {

            const formData = new FormData();

            formData.append(
                'client_id',
                visit.client_id
            );

            formData.append(
                'title',
                visit.title
            );

            formData.append(
                'description',
                visit.description
            );

            formData.append(
                'latitude',
                visit.latitude
            );

            formData.append(
                'longitude',
                visit.longitude
            );

            formData.append('photo', {
                uri: visit.photo_uri,
                type: 'image/jpeg',
                name: 'photo.jpg'
            });

            await api.post(
                '/visits',
                formData,
                {
                    headers: {
                        'Content-Type':
                            'multipart/form-data'
                    }
                }
            );

            visit.synced = true;
            visit.status = 'synced';

        } catch (error) {

            visit.status = 'failed';

            console.log(error);
        }
    }

    await AsyncStorage.setItem(
        'visits',
        JSON.stringify(visits)
    );
}
```

---

# Detectando internet

## src/utils/internet.js

```js
import NetInfo from '@react-native-community/netinfo';

import { syncPendingVisits }
    from '../services/syncService';

export function startInternetListener()
{
    NetInfo.addEventListener(state => {

        if (state.isConnected) {

            syncPendingVisits();

        }

    });
}
```

---

# Fluxo completo

```txt
Usuário cria visita
↓
Tira foto
↓
Seleciona localização
↓
Salva localmente
↓
Internet caiu?
↓
SIM
↓
Fica pendente
↓
Internet voltou
↓
Sync automático
↓
Laravel salva imagem
↓
Laravel salva coordenadas
↓
Registro sincronizado
```

---

# Melhorias futuras

## Backend

- múltiplas fotos
- compressão de imagem
- geolocalização avançada
- busca por raio
- paginação
- AWS S3

## Mobile

- SQLite
- retry automático
- upload em background
- fila visual de sync
- cache de mapas
- sincronização incremental
