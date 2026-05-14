# CadastroDeVisitas-ReactNative

Projeto academico em React Native/Expo com backend Laravel. A aplicacao permite cadastrar usuarios, fazer login, registrar visitas tecnicas com camera, mapa e localizacao, e sincronizar visitas pendentes quando houver conexao.

## Tecnologias

- React Native com Expo
- Expo Camera
- Expo Location
- React Native Maps
- Laravel API
- Laravel Sanctum
- MySQL/MariaDB

## Estrutura

```text
Backend/   API Laravel
Frontend/  Aplicativo Expo/React Native
```

## Configurando o backend

Entre na pasta do backend:

```bash
cd Backend
```

Instale as dependencias:

```bash
composer install
```

Crie o arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

Gere a chave da aplicacao:

```bash
php artisan key:generate
```

Configure no `.env` as credenciais do banco de dados:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=api_nicolas
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
```

Rode as migrations:

```bash
php artisan migrate
```

Crie o link publico do storage para as fotos das visitas:

```bash
php artisan storage:link
```

Inicie a API:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

## Rotas da API

Rotas publicas:

```text
POST /api/register
POST /api/auth
```

Rotas protegidas por token Bearer do Sanctum:

```text
GET  /api/me
POST /api/visits
POST /api/logout
```

Para usar as rotas protegidas, envie o header:

```text
Authorization: Bearer SEU_TOKEN
```

## Configurando o frontend

Entre na pasta do frontend:

```bash
cd Frontend
```

Instale as dependencias:

```bash
npm install
```

Inicie o Expo:

```bash
npm start
```

Tambem e possivel iniciar diretamente para Android:

```bash
npm run android
```

## Endereco da API no aplicativo

O frontend esta usando a API em:

```text
http://192.168.137.1:8000/api
```

Se o IP da sua maquina mudar, atualize esse endereco nos arquivos:

```text
Frontend/app/(auth)/login.tsx
Frontend/app/(auth)/register.tsx
Frontend/app/(tabs)/CadastroVisitas.tsx
```

No celular fisico, o aparelho e o computador precisam estar na mesma rede. No emulador Android, pode ser necessario trocar o IP por `10.0.2.2`.

## Fluxo offline das visitas

As visitas sao salvas primeiro no `AsyncStorage`. Se a API estiver disponivel, o aplicativo sincroniza a visita com `POST /api/visits` usando o token do usuario como Bearer.

Se estiver offline ou a API falhar, a visita fica pendente localmente e pode ser sincronizada depois pelo botao de sincronizacao na tela de cadastro de visitas.

## Observacoes

- O usuario precisa estar logado para cadastrar e sincronizar visitas.
- O token retornado no login/registro e salvo no app como `authToken`.
- As fotos das visitas sao enviadas como `multipart/form-data`.
- Para testar em dispositivo real, libere o firewall para a porta `8000` se necessario.
