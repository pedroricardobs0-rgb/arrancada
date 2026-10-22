# Placar de Arrancada

Site do campeonato de arrancada: eventos, tempos de pista (reação, 60 pés, 100 m, 201 m e velocidade final), mata-mata por categoria, Copa, ranking anual e cadastro de pilotos e carros.

- **Público:** vê eventos, tempos, rankings, pilotos e carros sem login.
- **Piloto:** cria conta com e-mail e senha, preenche nome, apelido, e-mail, telefone e foto, e cadastra os próprios carros. Só aparece no site depois da aprovação do admin. E-mail e telefone ficam visíveis só para o piloto e para o admin.
- **Admin:** aprova pilotos e cadastra categorias, campeonatos, eventos, puxadas e a Copa.

Tecnologia: Next.js 15 + Supabase (banco, login e fotos), hospedado na Vercel. Os planos grátis dos dois servem para começar.

---

## Colocar no ar (passo a passo)

### 1. Banco de dados (Supabase)
1. Crie uma conta em https://supabase.com e clique em **New project**. Guarde a senha do banco.
2. No projeto, abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.

### 2. Código no GitHub
1. Crie um repositório em https://github.com/new (pode ser privado).
2. Envie esta pasta para ele (`git push`).

### 3. Hospedagem (Vercel)
1. Crie uma conta em https://vercel.com usando o GitHub.
2. Clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL do passo 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave anon public do passo 1
4. Clique em **Deploy**. Ao final, a Vercel mostra o endereço do site (ex.: `https://placar-arrancada.vercel.app`).

### 4. Ligar o login ao endereço do site
No Supabase, em **Authentication → URL Configuration**:
- **Site URL:** o endereço da Vercel (ex.: `https://placar-arrancada.vercel.app`)
- **Redirect URLs:** adicione `https://placar-arrancada.vercel.app/**` e `http://localhost:3000/**`

### 5. Virar admin
1. No site, clique em **Entrar → Criar conta** e confirme o e-mail.
2. No Supabase, em **SQL Editor**, rode (trocando o e-mail):
   ```sql
   update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
   ```
3. Recarregue o site. O menu **Admin** aparece.

Para dar acesso de admin a outra pessoa, ela cria a conta no site e você roda o mesmo comando com o e-mail dela.

### 6. Primeiros cadastros
Em **Admin**: crie as categorias (de tempo, com índice de 201 m, ou por característica) e o campeonato. Depois crie os eventos na página inicial. Para testar antes, use **Carregar dados de exemplo** e depois **Remover dados de exemplo**.

---

## Avisos importantes
- **E-mails de confirmação:** o Supabase grátis envia poucos e-mails por hora. Com muitos pilotos se cadastrando no mesmo dia, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (ex.: Resend, Brevo ou Gmail).
- **Confirmação em outro aparelho:** se o piloto criar a conta no computador e abrir o link no celular, o link pode falhar. Para funcionar em qualquer aparelho, em **Authentication → Emails → Confirm signup**, troque o link do modelo por:
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/meu-cadastro`
  e, em **Reset Password**, por:
  `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`
- **Projeto pausado:** no plano grátis, o Supabase pausa o projeto depois de 7 dias sem acesso. Basta reativá-lo no painel.

---

## Rodar no seu computador
```bash
cp .env.example .env.local   # preencha com os dados do Supabase
npm install
npm run dev                  # abre em http://localhost:3000
```

## Regras implementadas
- Puxada inválida: reação negativa, 201 m abaixo do índice da categoria (só categoria de tempo) ou anulação manual com motivo.
- Etapa: classificatória por reação + 201 m. Os 4 primeiros fazem mata-mata (1º×4º, 2º×3º, final e disputa de 3º). Com menos de 4 pilotos, ou evento encerrado antes do fim, vale a classificatória.
- Pontos: tabela do campeonato, que pode ser trocada por etapa. Evento avulso não pontua. O ranking soma só etapas encerradas. Desempate: vitórias, depois melhor 201 m.
- Copa: o admin escolhe os carros e monta a 1ª rodada; a chave avança sozinha até 1º, 2º e 3º. Não pontua no ranking.
- Melhor tempo do carro no ano: calculado a partir das puxadas válidas.
