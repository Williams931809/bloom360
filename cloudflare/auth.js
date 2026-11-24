const cookieName = '__Host-bloom360';
const millisecondsPerDay = 86400000;
const encoder = new TextEncoder();
const hex = (bytes) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
const random = (size) => hex(crypto.getRandomValues(new Uint8Array(size)));
const sha256 = async (value) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({
    name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000,
  }, key, 256));
}

function equal(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return difference === 0;
}

const cookieToken = (request) => request.headers.get('Cookie')?.match(/(?:^|;\s*)__Host-bloom360=([a-f0-9]{64})(?:;|$)/)?.[1];

async function sessionIdentity(request, db) {
  const token = cookieToken(request);
  if (!token) return null;
  return first(db, 'SELECT credentials.id, credentials.email FROM sessions JOIN credentials ON credentials.id = sessions.user_id WHERE sessions.digest = ? AND expires > ?', await sha256(token), Date.now());
}

function cookieRedirect(value, maxAge) {
  return new Response(null, {status:303,headers:{Location:'/account','Cache-Control':'no-store',
    'Set-Cookie':cookieName + '=' + value + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=' + maxAge}});
}

async function startSession(db, id) {
  const token = random(32);
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires <= ?').bind(now),
    db.prepare('INSERT INTO sessions(digest,user_id,expires) VALUES(?,?,?)').bind(await sha256(token),id,now + 7 * millisecondsPerDay),
  ]);
  return cookieRedirect(token, 604800);
}

async function standaloneAccount(request, env, path) {
  const db = env.DB;
  const signup = path === '/signup';
  if (path === '/logout') {
    if (request.method !== 'POST') return redirect('/account');
    const token = cookieToken(request);
    if (token) await write(db,'DELETE FROM sessions WHERE digest = ?',await sha256(token));
    return cookieRedirect('', 0);
  }
  const owner = signup && !(await first(db,"SELECT id FROM accounts WHERE role = 'admin'"));
  if (request.method !== 'POST') {
    const title = signup ? 'Create your Bloom360 account' : 'Sign in to Bloom360';
    const form = owner && !env.ADMIN_SETUP_CODE ? notice('Administrator setup is pending.') :
      start(path) + field('email','Email address','','email')
      + field('password','Password','','password',true,128)
      + (owner ? field('code','Administrator setup code','','password',true,512) : '')
      + submit(signup ? 'Create account' : 'Sign in') + '</form>';
    return page(title,head(title) + block(form + '<div class="actions">' +
      button(signup ? '/login' : '/signup',signup ? 'Sign in' : 'Create account') + '</div>'),path);
  }

  const data = await request.formData();
  const email = text(data,'email',254).toLowerCase();
  const password = String(data.get('password') ?? '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) {
    return errorPage('Enter an email address and a password of 12 to 128 characters.',path);
  }
  const window = Math.floor(Date.now() / 900000);
  const limit = await first(db,`INSERT INTO login_limits(email,window,attempts) VALUES(?,?,1)
    ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END,window=excluded.window
    RETURNING attempts`,email,window);
  if (limit.attempts > 8) return errorPage('Too many attempts. Try again in a few minutes.',path,429);

  if (signup) {
    if (owner && (!env.ADMIN_SETUP_CODE || !equal(await sha256(text(data,'code',512)),await sha256(env.ADMIN_SETUP_CODE)))) {
      return errorPage('Enter the administrator setup code.',path,403);
    }
    const existing = await first(db, 'SELECT id FROM credentials WHERE email = ?', email);
    if (existing) return errorPage('Unable to create this account. Sign in if you already have an account.',path,409);
    const id = crypto.randomUUID();
    const salt = random(16);
    const digest = await passwordHash(password,salt);
    try {
      await db.batch([
        db.prepare('INSERT INTO credentials(id,email,salt,digest) VALUES(?,?,?,?)').bind(id,email,salt,digest),
        db.prepare('INSERT INTO accounts(id,email,role) VALUES(?,?,?)').bind(id,email,owner ? 'admin' : 'member'),
      ]);
    } catch (error) {
      if (!String(error).includes('UNIQUE constraint')) throw error;
      return errorPage('Registration changed while you were signing up. Please try again.',path,409);
    }
    return startSession(db,id);
  }

  const credentials = await first(db, 'SELECT id, salt, digest FROM credentials WHERE email = ?',email);
  const computed = await passwordHash(password, credentials?.salt ?? 'unused-account-salt');
  if (!credentials || !equal(computed,credentials.digest)) return errorPage('Email or password is incorrect.',path,401);
  await write(db,'DELETE FROM login_limits WHERE email = ?',email);
  return startSession(db,credentials.id);
}
