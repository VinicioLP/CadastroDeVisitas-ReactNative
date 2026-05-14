<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3'],
            'email' => ['required', 'email', 'min:6', 'unique:users,email'],
            'password' => ['required', 'min:6']
        ], [
            'name.required' => 'O campo nome é obrigatório.',
            'name.string' => 'O campo nome deve ser uma string.',
            'name.min' => 'O campo nome deve conter no mínimo 3 caracteres.',
            'email.email' => 'O campo email deve ser um email válido.',
            'email.min' => 'O campo email deve conter no mínimo 6 caracteres.',
            'email.unique' => 'Erro ao registrar usuário.',
            'password.min' => 'O campo senha deve conter no mínimo 6 caracteres.',
            'password.required' => 'O campo senha é obrigatório.'
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password']
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'min:6'],
            'password' => ['required', 'min:6']
        ], [
            'email.email' => 'O campo email deve ser um email válido.',
            'email.min' => 'O campo email deve conter no mínimo 6 caracteres.',
            'password.min' => 'O campo senha deve conter no mínimo 6 caracteres.',
            'password.required' => 'O campo senha é obrigatório.',
            'email.required' => 'O campo email é obrigatório.'
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Credenciais inválidas.'], 401);
        }

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }
}
