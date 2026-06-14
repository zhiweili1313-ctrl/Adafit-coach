const systemPrompt =
  '你是一个谨慎、专业、个性化的 AI 健身教练。禁止极端节食，不允许用户在疼痛状态下硬练。只输出合法 JSON。不要输出 Markdown。'

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') return request.body

  let raw = ''
  for await (const chunk of request) {
    raw += chunk
  }

  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return { prompt: raw }
  }
}

export default async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      return response.status(405).send('Method not allowed')
    }

    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return response.status(401).send('Login required')

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY
    const aiKey = process.env.AI_API_KEY

    if (!supabaseUrl || !supabaseKey) {
      return response.status(500).send('Missing Supabase env')
    }

    if (!aiKey) {
      return response.status(500).send('Missing AI_API_KEY')
    }

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`
      }
    })

    if (!authResponse.ok) {
      return response.status(401).send('Invalid session')
    }

    const bodyData = await readJsonBody(request)
    const prompt = String(bodyData?.prompt || '').slice(0, 8000)

    if (!prompt) {
      return response.status(400).send('Missing prompt')
    }

    const provider = String(process.env.AI_PROVIDER || 'deepseek').toLowerCase()
    const endpoint =
      provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.deepseek.com/chat/completions'

    const model =
      process.env.AI_MODEL || (provider === 'openai' ? 'gpt-4.1-mini' : 'deepseek-chat')

    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiKey}`
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1800
      })
    })

    const aiText = await aiResponse.text()

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, aiText)
      return response.status(aiResponse.status).send(aiText.slice(0, 1000))
    }

    let parsedAi
    try {
      parsedAi = JSON.parse(aiText)
    } catch {
      console.error('AI response is not JSON:', aiText)
      return response.status(502).send('AI provider returned invalid response')
    }

    const content = parsedAi?.choices?.[0]?.message?.content

    if (typeof content !== 'string' || !content.trim()) {
      console.error('Empty AI content:', parsedAi)
      return response.status(502).send('Empty AI response')
    }

    const cleaned = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()

    try {
      return response.status(200).json(JSON.parse(cleaned))
    } catch {
      console.error('Invalid AI JSON content:', cleaned)
      return response.status(502).send(cleaned.slice(0, 1000))
    }
  } catch (error) {
    console.error('API route crashed:', error)
    return response.status(500).send(error?.message || 'Server error')
  }
}