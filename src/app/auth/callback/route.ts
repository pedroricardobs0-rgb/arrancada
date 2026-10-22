import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Recebe o link de confirmação/redefinição enviado por e-mail.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next')?.startsWith('/') ? url.searchParams.get('next')! : '/meu-cadastro';
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const sb = await createClient();
  const { error } = code
    ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash && type ? await sb.auth.verifyOtp({ token_hash: tokenHash, type }) : { error: new Error('link inválido') };
  if (error) return NextResponse.redirect(new URL('/entrar?erro=link', url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
