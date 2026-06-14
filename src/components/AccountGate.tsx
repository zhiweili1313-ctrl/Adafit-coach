import { useState } from 'react'
import { ArrowRight, Dumbbell, UserPlus } from 'lucide-react'
import { fieldClass, primaryButton, secondaryButton } from './ui'

export default function AccountGate({ cloudEnabled, onLogin, onRegister }: { cloudEnabled: boolean; onLogin: (account: string, password: string) => Promise<void>; onRegister: (account: string, password: string, name: string) => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'login') await onLogin(account, password)
      else await onRegister(account, password, name)
    } catch (value) { setError(value instanceof Error ? value.message : '操作失败') }
    finally { setLoading(false) }
  }
  return <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-paper px-6 py-8">
    <div className="grid h-14 w-14 place-items-center rounded-xl bg-ink text-lime"><Dumbbell size={27} /></div>
    <div className="mt-10"><p className="text-xs font-bold uppercase text-black/40">Adaptive Fit Coach</p><h1 className="mt-2 text-3xl font-extrabold">{mode === 'login' ? '登录你的账号' : '创建个人账号'}</h1><p className="mt-3 text-sm leading-6 text-black/50">{cloudEnabled ? '使用邮箱和密码登录，在不同手机上访问自己的计划和记录。' : '本地开发模式：账号数据仅保存在当前浏览器。'}</p></div>
    {mode === 'register' && <label className="mt-6 block text-sm font-bold">昵称<input className={fieldClass} value={name} onChange={event => setName(event.target.value)} placeholder="显示在首页的名字" /></label>}
    <label className={`${mode === 'register' ? 'mt-4' : 'mt-6'} block text-sm font-bold`}>{cloudEnabled ? '邮箱账号' : '账号'}<input autoFocus type={cloudEnabled ? 'email' : 'text'} autoComplete="username" className={fieldClass} value={account} onChange={event => setAccount(event.target.value)} placeholder={cloudEnabled ? 'name@example.com' : '输入账号'} /></label>
    <label className="mt-4 block text-sm font-bold">密码<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={fieldClass} value={password} onChange={event => setPassword(event.target.value)} onKeyDown={event => event.key === 'Enter' && submit()} placeholder="至少 6 位" /></label>
    {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button onClick={submit} disabled={loading || !account.trim() || password.length < 6 || (mode === 'register' && !name.trim())} className={`${primaryButton} mt-4 flex w-full items-center justify-center gap-2`}>{mode === 'login' ? <ArrowRight size={18} /> : <UserPlus size={18} />}{loading ? '请稍候' : mode === 'login' ? '登录' : '注册并继续'}</button>
    <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className={`${secondaryButton} mt-3 w-full`}>{mode === 'login' ? '注册新账号' : '已有账号，去登录'}</button>
  </main>
}
