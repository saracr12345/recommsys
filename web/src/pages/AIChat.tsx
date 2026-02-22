// web/src/pages/AIChat.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Send, Plus, MessageCircle, Sparkles, Clock } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/AuthContext'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'assistant'; content: string }
type Thread = { id: number; title: string; createdAt: string }

export default function AIChatPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [threads, setThreads] = useState<Thread[]>([])
  const [threadId, setThreadId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // auth redirect
  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  function shortTitle(title: string) {
    const t = String(title || '').trim()
    if (!t) return 'New chat…'
    const words = t.split(/\s+/).filter(Boolean)
    const two = words.slice(0, 2).join(' ')
    return words.length > 2 ? `${two}…` : two
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const scroller = scrollerRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
      requestAnimationFrame(() => {
        const s2 = scrollerRef.current
        if (s2) s2.scrollTop = s2.scrollHeight
      })
    })
  }

  // Load chat threads on mount (start fresh each time you visit this page)
  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        setError('')
        const data = await api<{ ok: boolean; threads: Thread[]; error?: string }>('/chat/threads', {
          method: 'GET',
        })

        if (!data.ok) throw new Error(data.error || 'Failed to load threads')
        setThreads(data.threads ?? [])

        // Start fresh chat every time user returns here
        setThreadId(null)
        setMessages([])
        setInput('')
        setSending(false)

        scrollToBottom('auto')
      } catch (e: any) {
        console.error(e)
        setError(e?.message || 'Failed to load chats')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Keep view at bottom when messages update
  useEffect(() => {
    scrollToBottom('auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sending])

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending])

  async function refreshThreads() {
    const data = await api<{ ok: boolean; threads: Thread[]; error?: string }>('/chat/threads', {
      method: 'GET',
    })
    if (!data.ok) throw new Error(data.error || 'Failed to reload threads')
    setThreads(data.threads ?? [])
  }

  async function selectThread(id: number) {
    setError('')
    setThreadId(id)

    const data = await api<{
      ok: boolean
      threadId: number
      messages: Array<{ role: string; content: string }>
      error?: string
    }>(`/chat/thread/${id}`, { method: 'GET' })

    if (!data.ok) throw new Error(data.error || 'Failed to load thread')

    const msgs: Msg[] = (data.messages ?? [])
      .map((m): Msg => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as Msg['role'],
        content: String(m.content || ''),
      }))
      .filter((m) => m.content.trim().length > 0)

    setMessages(msgs)
    setTimeout(() => scrollToBottom('auto'), 0)
  }

  function startNewChat() {
    setError('')
    setInput('')
    setThreadId(null)
    setMessages([])
    setTimeout(() => scrollToBottom('auto'), 0)
  }

  async function send() {
    if (!canSend) return

    setError('')
    setSending(true)

    const text = input.trim()
    setInput('')

    // optimistic user message
    setMessages((m) => [...m, { role: 'user', content: text }])

    try {
      const data = await api<{
        ok: boolean
        threadId: number
        reply: string
        error?: string
      }>('/chat', {
        method: 'POST',
        body: JSON.stringify({ threadId, message: text }),
      })

      if (!data.ok) throw new Error(data.error || 'Chat failed')

      // New thread created on first message
      if (threadId == null) {
        setThreadId(data.threadId)
        await refreshThreads()
      }

      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      setTimeout(() => scrollToBottom('auto'), 0)
    } catch (e: any) {
      setError(e?.message || 'Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
      <div className="flex h-screen gap-6 px-6 py-6">
        {/* MAIN CHAT */}
        <main className="flex-1 flex flex-col max-w-4xl">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                  AI Chat
                </h1>
              </div>
              <p className="text-slate-600 text-sm">Ask about LLMs, benchmarks, or which model to use</p>
            </div>
            <div className="px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
              Beta
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 flex flex-col rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg overflow-hidden">
            {/* Messages Area */}
            <div
              ref={scrollerRef}
              className="flex-1 overflow-y-auto px-8 py-6 space-y-6 bg-gradient-to-b from-slate-50/50 via-white to-white"
            >
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <div className="mb-6 inline-flex p-4 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl">
                      <MessageCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">Start a Conversation</h3>
                    <p className="text-slate-600 text-sm mb-6">Try asking something like:</p>

                    <div className="space-y-2 text-left">
                      <button
                        type="button"
                        className="w-full text-left p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                        onClick={() => setInput('Explain RAG in simple terms')}
                      >
                        💡 "Explain RAG in simple terms"
                      </button>
                      <button
                        type="button"
                        className="w-full text-left p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                        onClick={() => setInput('Which model should I use for financial sentiment?')}
                      >
                        💡 "Which model for financial sentiment?"
                      </button>
                      <button
                        type="button"
                        className="w-full text-left p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
                        onClick={() => setInput('What does this recommendation pipeline mean?')}
                      >
                        💡 "What does this pipeline mean?"
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((m, idx) => (
                    <ChatBubble key={idx} msg={m} />
                  ))}

                  {sending && (
                    <div className="flex justify-start">
                      <div className="max-w-xs px-6 py-4 rounded-2xl bg-white border border-slate-200 shadow-md">
                        <div className="text-xs font-semibold text-slate-600 mb-3">Assistant</div>
                        <div className="flex gap-2">
                          <Dot />
                          <Dot delay={120} />
                          <Dot delay={240} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mx-6 my-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                  ⚠
                </div>
                <div>{error}</div>
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-slate-200 bg-white p-6 space-y-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void send()
                    }
                  }}
                />

                <button
                  onClick={() => void send()}
                  disabled={!canSend}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-200 flex-shrink-0',
                    canSend
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50',
                  )}
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">Shift + Enter for new line</p>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR - Chat History */}
        <aside className="w-72 flex flex-col rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm shadow-lg overflow-hidden">
          {/* Sidebar Header */}
          <div className="border-b border-slate-200 p-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Chat History</h2>
            <button
              onClick={startNewChat}
              className="p-2 rounded-lg hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all"
              title="New chat"
              type="button"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-3 border-b border-slate-200">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 text-emerald-700 font-semibold text-sm hover:from-emerald-100 hover:to-emerald-100 transition-all"
              type="button"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {threads.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No chats yet</p>
              </div>
            ) : (
              threads.map((t) => {
                const active = t.id === threadId
                return (
                  <button
                    key={t.id}
                    onClick={() => void selectThread(t.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200',
                      active
                        ? 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-900 border border-emerald-300 shadow-md'
                        : 'text-slate-700 hover:bg-slate-100 border border-transparent',
                    )}
                    title={t.title}
                    type="button"
                  >
                    <div className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{shortTitle(t.title)}</span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-slate-200 p-4 text-xs text-slate-500 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Chat history auto-saves</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ============ Chat Bubble (with Markdown) ============ */

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'w-full max-w-[520px] px-6 py-4 rounded-2xl shadow-md border transition-all duration-200',
          isUser
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white border-emerald-700'
            : 'bg-white text-slate-900 border-slate-200 hover:shadow-lg',
        )}
      >
        <div
          className={cn(
            'text-xs font-semibold mb-2 opacity-75',
            isUser ? 'text-emerald-100' : 'text-slate-600',
          )}
        >
          {isUser ? 'You' : 'Assistant'}
        </div>

        <div className={cn('text-sm leading-relaxed break-words', isUser ? 'text-white' : 'text-slate-900')}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              p: ({ children }) => <p className="my-2">{children}</p>,
              li: ({ children }) => <li className="my-1">{children}</li>,
              ul: ({ children }) => <ul className="my-2 pl-5 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="my-2 pl-5 list-decimal">{children}</ol>,
              h1: ({ children }) => <h1 className="text-base font-extrabold my-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-extrabold my-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold my-2">{children}</h3>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(isUser ? 'underline text-white' : 'underline font-semibold')}
                >
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                const isBlock = typeof className === 'string' && className.includes('language-')
                const text = String(children ?? '').replace(/\n$/, '')
                if (!isBlock) {
                  return (
                    <code
                      className={cn(
                        'px-1.5 py-0.5 rounded-md font-mono text-[13px]',
                        isUser ? 'bg-white/15' : 'bg-black/5',
                      )}
                    >
                      {text}
                    </code>
                  )
                }
                return (
                  <pre className={cn('my-2 p-3 rounded-xl overflow-x-auto', isUser ? 'bg-white/10' : 'bg-black/5')}>
                    <code className={cn('font-mono text-[13px]', className)}>{text}</code>
                  </pre>
                )
              },
              blockquote: ({ children }) => (
                <blockquote
                  className={cn(
                    'my-2 px-3 py-2 rounded-lg border-l-4',
                    isUser ? 'border-white/40 bg-white/10' : 'border-slate-200 bg-black/3',
                  )}
                >
                  {children}
                </blockquote>
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

/* ============ Loading Dots (fixed cleanup) ============ */

function Dot({ delay = 0 }: { delay?: number }) {
  const [up, setUp] = useState(false)

  useEffect(() => {
    let intervalId: number | null = null

    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => setUp((v) => !v), 420)
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId != null) window.clearInterval(intervalId)
    }
  }, [delay])

  return (
    <span
      className={cn(
        'w-2 h-2 rounded-full bg-slate-400 inline-block transition-transform',
        up ? 'translate-y-[-2px]' : 'translate-y-[2px]',
      )}
    />
  )
}