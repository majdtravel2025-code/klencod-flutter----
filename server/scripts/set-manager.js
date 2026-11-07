// الاستخدام: node server/scripts/set-manager.js <كلمة-المرور-الجديدة> [اسم-الدخول]
// يعيد ضبط كلمة مرور المدير إذا نسيتها.
import * as store from '../lib/store.js';
import { hashPassword } from '../lib/auth.js';

const [pass, login] = process.argv.slice(2);
if (!pass || pass.length < 8) {
  console.error('اكتب كلمة مرور من 8 أحرف على الأقل:  node server/scripts/set-manager.js كلمة-المرور');
  process.exit(1);
}
store.init(null);
const d = store.get();
let m = d.users.find((u) => u.role === 'manager');
if (!m) {
  m = { id: 'u' + Date.now().toString(36), role: 'manager', name: 'المدير', login: (login || 'manager').toLowerCase(), createdAt: Date.now() };
  d.users.push(m);
}
if (login) m.login = login.toLowerCase();
m.pass = hashPassword(pass);
store.flush();
console.log('تم تحديث حساب المدير. اسم الدخول: ' + m.login);
