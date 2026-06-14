const systemPrompt = '你是一个谨慎、专业、个性化的 AI 健身教练。禁止极端节食，不允许用户在疼痛状态下硬练。只输出合法 JSON。'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed')
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return response.status(401).send('Login required')

  const authResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  })
  if (!authResponse.ok) return response.status(401).send('Invalid session')

  const provider = process.env.AI_PROVIDER || 'DeepSeek'
  const endpoint = provider === 'OpenAI' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions'
  const model = process.env.AI_MODEL || (provider === 'OpenAI' ? 'gpt-4.1-mini' : 'deepseek-chat')
  const aiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` },
    body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: String(request.body?.prompt || '').slice(0, 8000) }], temperature: 0.3, max_tokens: 900 })
  })
  if (!aiResponse.ok) return response.status(aiResponse.status).send((await aiResponse.text()).slice(0, 500))
  const body = await aiResponse.json()
  const content = body?.choices?.[0]?.message?.content
  if (typeof content !== 'string') return response.status(502).send('Empty AI response')
  try { return response.status(200).json(JSON.parse(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim())) }
  catch { return response.status(502).send('Invalid AI JSON') }
}
