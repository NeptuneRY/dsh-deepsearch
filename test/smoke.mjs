// Smoke test for dsh-deepsearch. Runs without a browser or a real harness:
// a fake ctx drives the host half, a fake React drives the client half.
//
//   node test/smoke.mjs
//
// Config and history are written into a temp dir (never the real data root).

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const PKG_VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const dataRoot = mkdtempSync(join(tmpdir(), 'dsh-deepsearch-smoke-'))
// Export-to-desktop must never touch the real desktop during tests.
const fakeHome = mkdtempSync(join(tmpdir(), 'dsh-deepsearch-home-'))
process.env.HOME = fakeHome
process.env.USERPROFILE = fakeHome

// ---------------------------------------------------------------------------
// host half
// ---------------------------------------------------------------------------

const nativeCalls = []
const webCalls = []
const activations = []
const shadows = []
const restrictions = []
const workspaces = []
const createdSessions = []
const sessionPrompts = []
const deferred = []

function nativeDef(name) {
  return {
    name,
    description: `native ${name}`,
    output: {
      schema: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] },
      render: (_args, value) => [{ type: 'text', text: `native:${value?.content ?? ''}` }],
    },
    execute: async (args) => {
      nativeCalls.push({ name, args })
      return { content: `raw ${name}` }
    },
  }
}

const natives = { web_search: nativeDef('web_search'), web_fetch: nativeDef('web_fetch') }

function makeAgent(id, header) {
  const scoped = {
    tools: {
      // Tools on the agent plane are only visible when the agent is passed as scope.
      get: (name, scope) => (scope ? natives[name] ?? null : null),
      register: (definition) => {
        shadows.push({ agent: id, definition })
        return () => {}
      },
      restrict: (filter) => {
        const entry = { agent: id, filter, active: true }
        restrictions.push(entry)
        return () => {
          entry.active = false
        }
      },
    },
  }
  return {
    session: { header: { id, origin: 'root', ...(header || {}) } },
    ctx: {
      tools: scoped.tools,
      plugin: (mod) => {
        mod.apply(scoped)
        return { dispose() {} }
      },
    },
  }
}

const rootAgent = makeAgent('root-1')
const childAgent = makeAgent('child-1', { origin: 'subagent', parentSession: 'root-1', delegationDepth: 1 })
const workspaceAgent = makeAgent('workspace-1', { cwd: join(dataRoot, 'workspace') })
// A subagent may inherit a different cwd; only the parent chain can identify it.
const workspaceChildAgent = makeAgent('workspace-child-1', {
  origin: 'subagent',
  cwd: join(dataRoot, 'subagent-cwd'),
  parentSession: 'workspace-1',
  delegationDepth: 1,
})

function fakeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(payload) {
      this.body = String(payload ?? '')
    },
  }
}

function fakeReq(method, url, body) {
  const stream = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  stream.method = method
  stream.url = url
  return stream
}

const handlers = new Map()
let routeHandler = null
const disposers = []
const registeredTools = []
const activeTools = new Set()

const services = {
  agents: {
    list: () => [rootAgent, childAgent, workspaceAgent, workspaceChildAgent],
    get: (id) => [rootAgent, childAgent, workspaceAgent, workspaceChildAgent].find((agent) => agent.session.header.id === id) ?? null,
    roots: () => [rootAgent],
  },
  subagents: {
    list: () => ['fork', 'spawn'],
    startActivation: async (spec) => {
      activations.push(spec)
      const pending = deferred.shift() || null
      const result = pending
        ? pending.promise
        : Promise.resolve({ output: [{ type: 'text', text: 'digest text' }], stopReason: 'completed' })
      // Like the real service: the activation resolves immediately and carries
      // a still-pending result promise.
      return {
        childId: `child-${activations.length}`,
        result,
        dispose: async () => {},
      }
    },
  },
  web: {
    search: async ({ query, maxResults }) => {
      webCalls.push({ query, maxResults })
      return {
        sources: [
          { url: `https://example.com/${encodeURIComponent(query)}`, title: `T ${query}`, snippet: `S ${query}` },
          { url: 'https://example.com/shared', title: 'shared', snippet: 'shared snippet' },
        ],
        truncated: false,
      }
    },
  },
  workspaceRegistry: {
    create: async (dir, title) => {
      const workspace = {
        id: `ws-${workspaces.length + 1}`,
        path: dir,
        title,
        sessionIds: [],
        attachSession: async (sessionId) => {
          workspace.sessionIds.push(sessionId)
        },
      }
      workspaces.push(workspace)
      return workspace
    },
    get: (id) => workspaces.find((workspace) => workspace.id === id) ?? null,
  },
  sessionController: {
    create: async (request) => {
      createdSessions.push({ ...request })
      return { sessionId: `session-panel-${createdSessions.length}` }
    },
    prompt: async (request) => {
      sessionPrompts.push({ ...request })
      const asked = sessionPrompts.filter((item) => item.sessionId === request.sessionId).length
      const emit = handlers.get('session/event')
      if (emit) {
        const session = { id: request.sessionId }
        // The nudge path: a compression-style recap first, the report on the
        // second ask — the plugin must not lose the round to the recap.
        const nudged = String(request.content?.[0]?.text || '').includes('只有一段过程叙述')
        const body = nudged
          ? `# 救回来的报告

${'补救后重新输出的正文。'.repeat(12)}`
          : asked === 1 && String(request.content?.[0]?.text || '').includes('需要救回')
            ? '第 1 轮报告已经完成：《测试报告》（8189 字符），报告保存由宿主负责。'
            : `# 测试报告

session answer

${'这是一段用于冒烟测试的正文。'.repeat(12)}`
        emit(session, { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: body }] } } })
        emit(session, { type: 'turn/end', data: { reason: { kind: 'completed' } } })
      }
      return { accepted: true }
    },
  },
  webServer: {
    register: (route) => {
      routeHandler = route.handler
      return () => {}
    },
  },
}

const fakeCtx = {
  logger: { info() {} },
  effect(fn) {
    disposers.push(fn())
    return () => {}
  },
  on(event, handler) {
    handlers.set(event, handler)
  },
  get(name) {
    return services[name] ?? null
  },
  tools: { get: (name, scope) => (scope ? natives[name] ?? null : null) },
}

// Cordis exposes injected services as ctx.<name>, so the fake does the same.
Object.assign(fakeCtx, {
  agents: services.agents,
  subagents: services.subagents,
  web: services.web,
  webServer: services.webServer,
  workspaceRegistry: services.workspaceRegistry,
  sessionController: services.sessionController,
  tools: Object.assign(fakeCtx.tools, {
    list: () => [],
    register: (definition) => {
      registeredTools.push(definition)
      activeTools.add(definition)
      return () => activeTools.delete(definition)
    },
    restrict: () => {},
  }),
})

const host = await import(pathToFileURL(join(ROOT, 'lib/index.js')).href)
host.apply(fakeCtx, { dataRoot })

// agent/created only tracks sessions now: the native web tools stay untouched.
await handlers.get('agent/created')({ agent: rootAgent })
await Promise.resolve()

// routes
async function call(method, path, body) {
  const res = fakeRes()
  await routeHandler(fakeReq(method, `/dsh-deepsearch${path}`, body), res)
  return { status: res.statusCode, json: JSON.parse(res.body || '{}') }
}

let state = (await call('GET', '/state')).json
assert.equal(state.version, PKG_VERSION)
assert.equal(state.workspace, join(dataRoot, 'workspace'))
assert.ok(Array.isArray(state.configFields) && state.configFields.some((field) => field.key === 'deepsearchSubagents'))
assert.ok(state.configFields.some((field) => field.key === 'deepsearchBriefWords'))
assert.ok(state.configFields.some((field) => field.key === 'deepsearchSubagentToolCalls'), 'subagent tool cap configurable')
assert.equal(state.config.deepsearchSubagentToolCalls, 0, 'subagent tool cap is unlimited by default')
assert.ok(!state.configFields.some((field) => field.key === 'interceptSearch'), 'shadow knobs removed')
assert.ok(!state.configFields.some((field) => field.key === 'subagentProvider'), 'provider knob removed')
assert.ok(state.configFields.some((field) => field.key === 'deepsearchSummaryChars'), 'summary length configurable')
assert.equal(state.config.deepsearchSummaryChars, 6000)
assert.ok(state.configFields.some((field) => field.key === 'reportDir'), 'report folder configurable')
assert.ok(!state.configFields.some((field) => field.key === 'methodFile'), 'deprecated method file key removed')
assert.ok(state.configFields.some((field) => field.key === 'referencePaths'), 'reference paths configurable')
assert.ok(!state.configFields.some((field) => field.key === 'memoryRoot'), 'memory root knob removed')
assert.ok(!state.configFields.some((field) => field.key === 'deepsearchOpenFiles'), 'memory open-files knob removed')
assert.ok(state.configFields.some((field) => field.key === 'deepsearchWorkspaceToolEnabled'), 'workspace tool knob configurable')
assert.ok(state.configFields.some((field) => field.key === 'deepsearchWorkspaceUnlimited'), 'workspace cap knob configurable')
assert.equal(state.config.deepsearchWorkspaceUnlimited, false, 'workspace cap starts lifted-or-not as off')
assert.ok(!state.configFields.some((field) => field.key === 'deepsearchChildSessions'), 'old child-session knob is gone')
assert.equal(state.config.deepsearchWorkspaceToolEnabled, false, 'workspace tool hidden by default')
assert.ok(restrictions.some((item) => item.agent === 'workspace-1' && item.active), 'workspace agent cannot see the tool by default')
assert.ok(!restrictions.some((item) => item.agent === 'root-1' && item.active), 'ordinary agent keeps the tool')
assert.equal(state.config.deepsearchRounds, 1, 'deep search defaults to one round')
assert.ok(state.configFields.some((field) => field.key === 'panelAgentTimeoutSec'), 'agent timeout in seconds')
assert.ok(state.configFields.some((field) => field.key === 'methodBundled'), 'bundled method switch exposed')
assert.ok(state.configFields.some((field) => field.key === 'deepsearchEnabled'), 'deepsearch tool + skill switch exposed')
assert.ok(!state.configFields.some((field) => field.key.endsWith('TimeoutMs')), 'no millisecond knobs left')

const methodsInfo = (await call('GET', '/methods')).json
assert.equal(methodsInfo.bundled, true)
assert.equal(methodsInfo.configured, false)
assert.equal(methodsInfo.customPath, '')
assert.ok(methodsInfo.chars > 0, 'bundled method notes are readable')

await call('POST', '/config', { values: { methodBundled: false } })
const customMethods = (await call('GET', '/methods')).json
assert.equal(customMethods.bundled, false)
assert.equal(customMethods.configured, false)
assert.equal(customMethods.chars, 0)
await call('POST', '/config', { values: { methodBundled: true } })

// Visibility, not a runtime refusal: the workspace agent is masked by the
// per-agent restrict layer; opening the second switch unmasks it.
const guardDeepsearchTool = registeredTools.find((tool) => tool.name === 'deepsearch')
assert.ok(guardDeepsearchTool, 'deepsearch tool registered')
await call('POST', '/config', { values: { deepsearchWorkspaceToolEnabled: true } })
assert.equal(restrictions.filter((item) => item.agent === 'workspace-1' && item.active).length, 0, 'workspace agent sees the tool when its switch is on')
await call('POST', '/config', { values: { deepsearchWorkspaceToolEnabled: false } })
assert.ok(restrictions.some((item) => item.agent === 'workspace-1' && item.active), 'workspace agent is masked again')
assert.ok(state.configFields.some((field) => field.key === 'deepsearchPtc'), 'ptc switch is configurable')
assert.equal(state.config.deepsearchPtc, true, 'ptc is on by default')
assert.ok(state.desktop.length > 0, 'desktop path exposed')
assert.ok(state.attached.some((item) => item.id === 'root-1'), 'root session tracked')

const legacySearch = await call('POST', '/panel/search', { query: 'legacy' })
assert.equal(legacySearch.status, 404, 'manual search route is gone')

const agentCall = await call('POST', '/panel/agent', { query: 'how does it work' })
assert.equal(agentCall.status, 200)
assert.equal(agentCall.json.entry.mode, 'agent')
assert.equal(agentCall.json.entry.provider, 'session', 'panel agents run as real workspace sessions')
assert.equal(agentCall.json.entry.sessionId, 'session-panel-1')
assert.match(agentCall.json.entry.markdown, /session answer/)
assert.equal(createdSessions.length, 1, 'one session created')
assert.equal(createdSessions[0].workspaceId, 'ws-1', 'session created inside the search workspace')
assert.equal(workspaces[0].path, join(dataRoot, 'workspace'))
assert.equal(workspaces[0].title, '深度搜索')
assert.equal(sessionPrompts.length, 1, 'one prompt delivered')
assert.match(sessionPrompts[0].content[0].text, /how does it work/)
assert.equal(sessionPrompts[0].mode, 'queue')
assert.deepEqual(workspaces[0].sessionIds, ['session-panel-1'], 'session attached to the workspace')

// a configured workspaceId reuses that workspace instead of creating another one
await call('POST', '/config', { values: { workspaceId: workspaces[0].id } })
const agentCall2 = await call('POST', '/panel/agent', { query: 'reuse the workspace' })
assert.equal(agentCall2.status, 200)
assert.equal(createdSessions[1].workspaceId, workspaces[0].id, 'configured workspace reused')
assert.equal(workspaces.length, 1, 'no extra workspace created')

// deepsearch: the report lands in the configured report folder; no index or commit
const reportDir = mkdtempSync(join(tmpdir(), 'dsh-deepsearch-reports-'))
const referenceDir = mkdtempSync(join(tmpdir(), 'dsh-deepsearch-refs-'))
writeFileSync(join(referenceDir, 'notes.md'), '# 本地资料\n\n已经确认过的结论。\n', 'utf8')
writeFileSync(join(referenceDir, 'notes2.md'), '# 第二份资料\n\n另一个文件。\n', 'utf8')
await call('POST', '/config', {
  values: {
    reportDir,
    referencePaths: [join(referenceDir, 'notes.md'), join(referenceDir, 'notes2.md')].join('\n'),
    referenceEnabled: true,
  },
})
const deepsearch = await call('POST', '/panel/deepsearch', { query: '前端构建工具 对比', useContext: true })
assert.equal(deepsearch.status, 200)
assert.equal(deepsearch.json.entry.mode, 'deepsearch')
assert.equal(deepsearch.json.entry.reportPath.startsWith(reportDir), true, 'absolute path under reportDir')
assert.equal(deepsearch.json.entry.useContext, true, 'context flag recorded')
assert.match(deepsearch.json.entry.markdown, /session answer/)
assert.equal(deepsearch.json.entry.provider, 'session', 'deepsearch runs as a visible session, never a hidden child')
assert.match(sessionPrompts[sessionPrompts.length - 1].content[0].text, /一级标题/)
assert.match(sessionPrompts[sessionPrompts.length - 1].content[0].text, /notes\.md/)
assert.match(sessionPrompts[sessionPrompts.length - 1].content[0].text, /notes2\.md/, 'multiple reference paths reach the prompt')
const reportFile = deepsearch.json.entry.reportPath
assert.match(readFileSync(reportFile, 'utf8'), /^# 测试报告/)
assert.equal('registered' in deepsearch.json.entry, false, 'no index registration field')
assert.equal('committed' in deepsearch.json.entry, false, 'no git commit field')

const badOpen = await call('POST', '/panel/open', { url: 'ftp://example.com/x' })
assert.equal(badOpen.status, 400, 'non-http links are rejected')

// The skill layer is gone: the tool description carries the trigger guidance.
const noSkillApi = await call('GET', '/skill')
assert.equal(noSkillApi.status, 404, 'skill endpoint is removed')
const noMirror = await call('POST', '/panel/sync-skill', {})
assert.equal(noMirror.status, 404, 'skill mirror endpoint is gone')

const sessionsBeforeContinuous = createdSessions.length
const promptsBeforeContinuous = sessionPrompts.length
const continuous = await call('POST', '/panel/deepsearch', { query: '持续调查 冒烟', rounds: 2 })
assert.equal(continuous.status, 200)
assert.equal(continuous.json.entry.continuous, true, 'continuous run is tagged')
assert.equal(continuous.json.entry.rounds, 2)
assert.equal(continuous.json.entry.reports.length, 2, 'one report per round')
assert.equal(createdSessions.length, sessionsBeforeContinuous + 1, 'one session for all rounds')
assert.equal(sessionPrompts.length, promptsBeforeContinuous + 2, 'one prompt per round')
assert.equal(sessionPrompts[promptsBeforeContinuous].sessionId, sessionPrompts[promptsBeforeContinuous + 1].sessionId, 'same session across rounds')
for (const item of continuous.json.entry.reports) {
  // 目录名来自第一轮报告标题（模型自己起的名字），不再是提问原文的截断。
  assert.equal(item.path.startsWith(reportDir), true, 'round report lives under reportDir')
  assert.match(item.path, /[\\/][^\\/]+[\\/]0[12]-[^\\/]+\.md$/, item.path)
  assert.equal(existsSync(item.path), true, 'round report exists on disk')
}
assert.match(readFileSync(continuous.json.entry.reports[1].path, 'utf8'), /前端构建工具 对比|持续调查 冒烟|session answer/)

const contPrompt = sessionPrompts[sessionPrompts.length - 1].content[0].text
assert.equal(contPrompt.includes(reportDir), false, 'same-session prompt does not point at the report folder')
assert.equal(contPrompt.includes(continuous.json.entry.reports[0].path), false, 'round 2 does not re-read the previous report file')
assert.match(contPrompt, /第 2\/2 轮/, 'round prompt names the round')
assert.match(contPrompt, /不要重新读报告文件/, 'round prompt tells the agent to use inherited context')
assert.equal(contPrompt.includes('不要调用 deepsearch 工具'), false, 'panel prompt does not carry the visibility rule')
assert.equal(contPrompt.includes('本轮新增'), false, 'continuous prompt prescribes no section headings')
assert.equal(contPrompt.includes('最多打开'), false, 'continuous prompt sets no fixed file cap')
assert.equal(contPrompt.includes('有几份读几份'), false, 'continuous prompt no longer names memory files')

const outsideDir = mkdtempSync(join(tmpdir(), 'dsh-deepsearch-out-'))
const outside = await call('POST', '/panel/deepsearch', { query: '外部保存 测试', outputDir: outsideDir })
assert.equal(outside.status, 200)
assert.equal(outside.json.entry.reportPath.startsWith(outsideDir), true, 'report written to the requested folder')
assert.equal(existsSync(outside.json.entry.reportPath), true, 'outside report exists on disk')
assert.equal('outside' in outside.json.entry, false, 'no memory-root bookkeeping field')

// One click exports the report, or every round report, to the desktop.
const exported = await call('POST', '/panel/export', {
  paths: [reportFile, continuous.json.entry.reports[0].path],
})
assert.equal(exported.status, 200)
assert.equal(exported.json.paths.length, 2, 'one copy per report')
assert.equal(exported.json.dir.startsWith(fakeHome), true, 'exported under the fake desktop')
for (const file of exported.json.paths) assert.equal(existsSync(file), true, 'exported file exists')


const okPrompt = services.sessionController.prompt
services.sessionController.prompt = async () => {
  throw new Error('prompt boom')
}
const failed = await call('POST', '/panel/agent', { query: 'fail case' })
assert.equal(failed.status, 500)
assert.match(failed.json.error, /prompt boom/)
await new Promise((resolve) => setImmediate(resolve))
services.sessionController.prompt = okPrompt

const saved = await call('POST', '/config', { values: { deepsearchSubagents: 2 } })
assert.equal(saved.status, 200)
assert.equal(saved.json.config.deepsearchSubagents, 2)
assert.ok(!('panelCount' in saved.json.config), 'manual search count is gone')
assert.ok(!('panelCount' in JSON.parse(readFileSync(join(dataRoot, 'config.json'), 'utf8'))), 'manual search count is not persisted')

state = (await call('GET', '/state')).json
assert.equal(state.history.length, 6, 'failed runs are recorded too')
assert.equal(state.history[0].mode, 'agent')
assert.equal(state.history[0].status, 'failed', 'failed agent run keeps its status')
assert.match(state.history[0].error, /prompt boom/)
const deepsearchHistory = state.history.find((entry) => entry.mode === 'deepsearch')
assert.ok(deepsearchHistory, 'deepsearch run recorded')
assert.ok(!('markdown' in deepsearchHistory), 'history list omits the markdown body')
assert.ok(deepsearchHistory.markdownChars > 0, 'history list reports body length')
const multiHistory = state.history.find((entry) => entry.mode === 'deepsearch' && Array.isArray(entry.reports) && entry.reports.length > 0)
assert.ok(multiHistory, 'history keeps every round path')
assert.ok(multiHistory.reports[0].path, 'round report path is present')
const full = (await call('POST', '/panel/entry', { id: deepsearchHistory.id })).json
assert.ok(full.entry.markdown.length > 0, 'entry route returns the body')
const multiFull = (await call('POST', '/panel/entry', { id: multiHistory.id })).json
assert.equal(multiFull.entry.reportBodies.length, 2, 'entry route returns every round report')
assert.ok(multiFull.entry.reportBodies.every((item) => String(item.markdown).startsWith('#')), 'round bodies are readable')
assert.ok(!multiFull.entry.reportBodies[0].markdown.includes('由 dsh-deepsearch'), 'generated footer is stripped')

// Agent records have no report file; export their Markdown directly by entry id.
const agentHistory = state.history.find((entry) => entry.mode === 'agent' && entry.status === 'ok')
assert.ok(agentHistory, 'successful agent entry present')
const agentExport = await call('POST', '/panel/export', { id: agentHistory.id })
assert.equal(agentExport.status, 200)
assert.equal(agentExport.json.paths.length, 1, 'one Markdown file written')
assert.equal(existsSync(agentExport.json.paths[0]), true, 'agent export exists on disk')
assert.match(readFileSync(agentExport.json.paths[0], 'utf8'), /session answer/)

// One more round keeps the same session and the same report folder.
const sessionsBeforeContinue = createdSessions.length
const promptsBeforeContinue = sessionPrompts.length
const continued = await call('POST', '/panel/continue', { id: multiHistory.id })
assert.equal(continued.status, 200)
assert.equal(continued.json.entry.rounds, 3, 'round count grows')
assert.equal(continued.json.entry.reports.length, 3, 'new report appended')
assert.equal(createdSessions.length, sessionsBeforeContinue, 'no new session created')
assert.equal(sessionPrompts.length, promptsBeforeContinue + 1, 'one prompt for the extra round')
assert.equal(sessionPrompts[sessionPrompts.length - 1].sessionId, multiHistory.sessionId, 'same session reused')
assert.equal(existsSync(continued.json.entry.reports[2].path), true, 'third report exists')
assert.match(continued.json.entry.reports[2].path, /03-[^\\/]+\.md$/, 'third report numbered 03')

const cleared = await call('POST', '/panel/clear')
assert.equal(cleared.json.ok, true)
state = (await call('GET', '/state')).json
assert.equal(state.history.length, 0)

// ---------------------------------------------------------------------------
// client half
// ---------------------------------------------------------------------------

const FakeReact = {
  createElement(type, props, ...children) {
    const next = { ...(props || {}) }
    if (children.length === 1) next.children = children[0]
    else if (children.length > 1) next.children = children
    return { type, props: next }
  },
  useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
  useEffect() {},
  useRef(value) {
    return { current: value }
  },
  useCallback(fn) {
    return fn
  },
}

let clientModule = null
const fakeWindow = {
  __ModuleLoader__: {
    load({ id, factory }) {
      clientModule = { id, exports: factory(() => FakeReact) }
    },
  },
}
const clientSource = readFileSync(join(ROOT, 'lib/client.js'), 'utf8')
new Function('window', clientSource)(fakeWindow)
assert.ok(clientModule, 'client module registered')

const client = clientModule.exports
assert.ok(client.__test, 'client exposes test hooks')
const { blocks, inline } = client.__test

const rendered = blocks(
  [
    '# Title',
    '',
    'Some **bold** and `code` and [a link](https://example.com/x).',
    '',
    '- first',
    '  - nested',
    '- second',
    '',
    '| a | b |',
    '| --- | --- |',
    '| 1 | 2 |',
    '',
    '> quoted',
    '',
    '```js',
    'const x = 1',
    '```',
  ].join('\n'),
)
const types = rendered.map((node) => node.type)
assert.ok(types.includes('h3'), 'heading rendered')
assert.ok(types.includes('p'), 'paragraph rendered')
assert.ok(types.includes('ul'), 'list rendered')
assert.ok(types.includes('table'), 'table rendered')
assert.ok(types.includes('blockquote'), 'quote rendered')
assert.ok(types.includes('pre'), 'code block rendered')
const link = inline('see [docs](https://example.com/d) now')[1]
assert.equal(link.type, 'a')
assert.equal(link.props.href, 'https://example.com/d')
assert.equal(link.props.target, '_blank')
const table = rendered.find((node) => node.type === 'table')
assert.equal(table.props.children[0].props.children.props.children.length, 2, 'two columns')
assert.equal(table.props.children[1].props.children.length, 1, 'one body row')
const plain = inline('a ** b ` c')
assert.equal(plain.map((part) => (typeof part === 'string' ? part : part.type)).join(''), 'a ** b ` c')

// apply() must register slots/locale and the better-sidebar tab without throwing
const slotsRegistered = []
const tabsRegistered = []
const clientCtx = {
  effect(fn) {
    disposers.push(fn())
    return () => {}
  },
  get: (name) =>
    name === 'betterSidebar'
      ? {
          registerTab: (tab) => {
            tabsRegistered.push(tab)
            return () => {}
          },
        }
      : null,
  locale: {
    register: () => {},
    bind: () => (key) => key,
  },
  slots: {
    inject: (_name, fn) => fn(),
    register: (definition) => {
      slotsRegistered.push(definition.name)
      return () => {}
    },
  },
}
client.apply(clientCtx)
assert.deepEqual(tabsRegistered.map((tab) => tab.id), ['dsh-deepsearch'], 'sidebar tab registered')
assert.ok(slotsRegistered.includes('main'), 'main slot registered')
assert.ok(slotsRegistered.includes('sidebar.panellist'), 'rail icon registered')
assert.ok(!slotsRegistered.includes('sidebar.panellist.actions'), 'no More-menu row: More stays hidden')
const deepsearchTool = registeredTools.find((tool) => tool.name === 'deepsearch')
assert.ok(deepsearchTool, 'deepsearch tool is registered for the agent')
assert.deepStrictEqual(Object.keys(deepsearchTool.parameters.properties).sort(), ['reference_paths', 'rounds', 'topic', 'use_context'])
assert.equal(deepsearchTool.parameters.properties.reference_paths.type, 'array', 'tool accepts multiple local paths')
assert.ok(deepsearchTool.parameters.required.includes('topic'), 'deepsearch tool requires a topic')
assert.match(deepsearchTool.description, /深度搜索/)
assert.match(deepsearchTool.description, /直接调用/)
assert.match(deepsearchTool.description, /调用后不要再额外派检索子代理/)
assert.equal(deepsearchTool.description.includes('若你已经处在面板'), false, 'tool description has no panel-scope prohibition')
assert.equal(existsSync(join(ROOT, 'skills')), false, 'skills directory is gone')

// Both switches off removes the tool; either one on registers it.
await call('POST', '/config', { values: { deepsearchEnabled: false, deepsearchWorkspaceToolEnabled: false } })
assert.equal(activeTools.size, 0, 'deepsearch tool is unregistered when both switches are off')
assert.equal(restrictions.filter((item) => item.active).length, 0, 'all visibility masks are lifted with the tool')
await call('POST', '/config', { values: { deepsearchWorkspaceToolEnabled: true } })
assert.ok(activeTools.size > 0, 'workspace switch alone registers the tool')
assert.equal(restrictions.filter((item) => item.agent === 'workspace-1' && item.active).length, 0, 'workspace switch reaches workspace agents')
assert.ok(restrictions.some((item) => item.agent === 'root-1' && item.active), 'ordinary agent is masked when only the workspace switch is on')

// A workspace subagent must resolve through its parent chain and be clamped.
const nestedTool = registeredTools.filter((tool) => tool.name === 'deepsearch').pop()
const nestedSessionsBefore = createdSessions.length
const nestedPromptsBefore = sessionPrompts.length
const nestedResult = await nestedTool.execute({ topic: '嵌套轮数冒烟', rounds: 3 }, { agent: workspaceChildAgent })
assert.equal(nestedResult.ok, true)
assert.equal(nestedResult.rounds, 1, 'workspace subagent is clamped to one round')
assert.equal(nestedResult.warning, undefined, 'nested call suppresses the clamp warning')
assert.equal(createdSessions.length, nestedSessionsBefore + 1, 'nested call creates exactly one session')
assert.equal(sessionPrompts.length, nestedPromptsBefore + 1, 'nested call sends exactly one prompt')

// The workspace owner can lift the one-round cap.
await call('POST', '/config', { values: { deepsearchWorkspaceUnlimited: true } })
const liftedSessionsBefore = createdSessions.length
const liftedResult = await nestedTool.execute({ topic: '解除限制冒烟', rounds: 3 }, { agent: workspaceChildAgent })
assert.equal(liftedResult.ok, true)
assert.equal(liftedResult.rounds, 3, 'workspace call keeps its rounds once the cap is lifted')
assert.equal(createdSessions.length, liftedSessionsBefore + 1, 'lifted run reuses one session')
await call('POST', '/config', { values: { deepsearchWorkspaceUnlimited: false } })
assert.equal((await call('GET', '/state')).json.config.deepsearchWorkspaceUnlimited, false, 'cap can be restored')

// An ordinary root agent keeps the requested round count.
const rootSessionsBefore = createdSessions.length
const rootPromptsBefore = sessionPrompts.length
const rootResult = await nestedTool.execute({ topic: '普通多轮冒烟', rounds: 2 }, { agent: rootAgent })
assert.equal(rootResult.ok, true)
assert.equal(rootResult.rounds, 2, 'ordinary root agent keeps multiple rounds')
assert.equal(rootResult.warning, undefined, 'ordinary root agent gets no warning')
assert.equal(createdSessions.length, rootSessionsBefore + 1, 'ordinary multi-round reuses one session')
assert.equal(sessionPrompts.length, rootPromptsBefore + 2, 'ordinary multi-round sends one prompt per round')

await call('POST', '/config', { values: { deepsearchWorkspaceToolEnabled: false, deepsearchEnabled: true } })
assert.ok(activeTools.size > 0, 'ordinary switch alone registers the tool')
assert.ok(restrictions.some((item) => item.agent === 'workspace-1' && item.active), 'workspace stays masked when its switch is off')
for (const disposer of disposers) {
  if (typeof disposer === 'function') disposer()
}

rmSync(dataRoot, { recursive: true, force: true })
rmSync(fakeHome, { recursive: true, force: true })
// PTC is a per-run choice: deep search sessions take it, Agent search does not.
await call('POST', '/config', { values: { deepsearchPtc: true } })
const ptcBefore = createdSessions.length
const ptcRun = await call('POST', '/panel/deepsearch', { query: 'PTC 冒烟' })
assert.equal(ptcRun.status, 200, JSON.stringify(ptcRun.json))
assert.equal(createdSessions[ptcBefore].agentPreset, 'ptc', 'deep search session uses the ptc preset')
const agentPtc = createdSessions.length
await call('POST', '/panel/agent', { query: 'agent stays standard' })
assert.equal(createdSessions[agentPtc].agentPreset, undefined, 'agent search keeps the default preset')
await call('POST', '/config', { values: { deepsearchPtc: false } })
const plainBefore = createdSessions.length
await call('POST', '/panel/deepsearch', { query: '标准模式 冒烟' })
assert.equal(createdSessions[plainBefore].agentPreset, undefined, 'switching ptc off restores the default preset')

// Numeric knobs carry their bounds; out-of-range values are clamped server-side.
{
  const fresh = (await call('GET', '/state')).json
  const numeric = fresh.configFields.filter((field) => field.type === 'number')
  assert.ok(numeric.length >= 8, 'numeric fields are enumerated')
  const unbounded = numeric.filter((field) => !Number.isFinite(field.min) || !Number.isFinite(field.max))
  assert.equal(unbounded.length, 0, `every numeric field carries min/max: ${unbounded.map((field) => field.key)}`)
  const clamped = (await call('POST', '/config', {
    values: { deepsearchSubagents: -3, deepsearchBriefWords: -1, deepsearchSummaryChars: -20 },
  })).json.config
  assert.equal(clamped.deepsearchSubagents, 0, 'negative subagent count clamps to 0')
  assert.equal(clamped.deepsearchBriefWords, 0, 'negative doc length clamps to 0')
  assert.equal(clamped.deepsearchSummaryChars, 200, 'negative summary length clamps to the minimum')
  await call('POST', '/config', { values: { deepsearchSubagents: 3, deepsearchBriefWords: 900, deepsearchSummaryChars: 4000 } })
}

// A turn taken over by a compression-style recap must be asked again, not lost.
{
  const askedBefore = sessionPrompts.length
  const rescued = await call('POST', '/panel/deepsearch', { query: '需要救回的主题 冒烟', rounds: 1 })
  assert.equal(rescued.json.ok, true, 'a recap-only answer gets one more ask')
  const texts = sessionPrompts.slice(askedBefore).map((item) => String(item.content?.[0]?.text || ''))
  assert.equal(texts.length, 2, 'the plugin asks twice: the run and one nudge')
  assert.ok(texts[1].includes('只有一段过程叙述'), 'the nudge says what was missing')
  const entry = rescued.json.entry
  assert.ok(String(entry.markdown || '').startsWith('# 救回来的报告'), 'the rescued report is what gets saved')
}

// Compression is a window-level feature: a deep search run needs its steps
// verbatim, so the session loses the tool unless the switch allows it.
{
  const fresh = (await call('GET', '/state')).json
  assert.ok(fresh.configFields.some((field) => field.key === 'deepsearchCompress'), 'compression switch is configurable')
  assert.equal(fresh.config.deepsearchCompress, false, 'compression is off by default')
  const sid = `session-panel-${createdSessions.length}`
  const agent = makeAgent(sid, {})
  const masked = () =>
    restrictions.filter((item) => item.agent === sid && item.active && (item.filter?.deny || []).includes('compress'))
  await handlers.get('agent/created')({ agent })
  assert.equal(masked().length, 1, 'deep search sessions lose the compress tool by default')
  await call('POST', '/config', { values: { deepsearchCompress: true } })
  await handlers.get('agent/created')({ agent })
  assert.equal(masked().length, 0, 'allowing compression removes the mask')
  await call('POST', '/config', { values: { deepsearchCompress: false } })
  await handlers.get('agent/created')({ agent })
  assert.equal(masked().length, 1, 'turning it back off restores the mask')
  await handlers.get('agent/disposed')({ agent })
  assert.equal(masked().length, 0, 'the mask is released when the agent goes away')
}

// With zero subagents there is no brief to cross-check and nothing running in
// the background, so those two checklist lines would contradict the prompt.
{
  await call('POST', '/config', { values: { deepsearchSubagents: 0 } })
  const before = sessionPrompts.length
  await call('POST', '/panel/deepsearch', { query: '不派子代理 冒烟', rounds: 1 })
  const text = String(sessionPrompts[before]?.content?.[0]?.text || '')
  assert.ok(text.includes('不要派子代理，自己逐个查完'), 'zero subagents says to search alone')
  assert.equal(text.includes('本次会话工具调用总数不超过'), false, 'zero subagents drops the tool budget')
  assert.equal(text.includes('派了子代理就等它们全部返回'), false, 'zero subagents drops the wait instruction')
  await call('POST', '/config', { values: { deepsearchSubagents: 3 } })
  const withChildren = sessionPrompts.length
  await call('POST', '/panel/deepsearch', { query: '派子代理 冒烟', rounds: 1 })
  const both = String(sessionPrompts[withChildren]?.content?.[0]?.text || '')
  assert.ok(both.includes('本次会话工具调用总数不超过'), 'subagents keep the tool budget')
  assert.ok(both.includes('派了子代理就等它们全部返回'), 'subagents keep the wait instruction')
}

// The sidebar entry is optional and lives in the plugin panel config.
{
  const before = (await call('GET', '/state')).json
  assert.ok(before.configFields.some((field) => field.key === 'sidebarEntry'), 'sidebar entry switch is configurable')
  assert.equal(before.config.sidebarEntry, true, 'the sidebar entry shows by default')
  await call('POST', '/config', { values: { sidebarEntry: false } })
  const hidden = (await call('GET', '/state')).json
  assert.equal(hidden.config.sidebarEntry, false, 'the sidebar entry can be turned off')
  await call('POST', '/config', { values: { sidebarEntry: true } })
  const shown = (await call('GET', '/state')).json
  assert.equal(shown.config.sidebarEntry, true, 'turning it back on restores the entry')
}

// -- a deepsearch run is visible (and stoppable) from the first second -------
{
  const hangingPrompt = services.sessionController.prompt
  services.sessionController.prompt = async (request, signal) => {
    sessionPrompts.push({ ...request })
    await new Promise((resolve, reject) => {
      if (signal && typeof signal.addEventListener === 'function') {
        if (signal.aborted) return reject(new Error('aborted'))
        signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
        return undefined
      }
      return undefined
    })
  }
  const pending = call('POST', '/panel/deepsearch', { query: '正在跑的深度搜索', rounds: 2 })
  await new Promise((resolve) => setTimeout(resolve, 60))
  const running = (await call('GET', '/state')).json.history[0]
  assert.equal(running.query, '正在跑的深度搜索')
  assert.equal(running.status, 'running', 'the card exists while the run is still going')
  assert.equal(running.reportPath, '', 'no report yet')
  const stopped = await call('POST', '/run/stop', { id: running.id })
  assert.equal(stopped.status, 200)
  assert.equal(stopped.json.ok, true)
  assert.equal(stopped.json.entry.status, 'aborted')
  const after = await pending
  assert.equal(after.json.aborted, true, 'the waiting request unwinds as aborted')
  const gone = await call('POST', '/run/stop', { id: running.id })
  assert.equal(gone.status, 404, 'a stopped run cannot be stopped twice')
  const listed = (await call('GET', '/state')).json.history[0]
  assert.equal(listed.status, 'aborted')
  services.sessionController.prompt = hangingPrompt
}

process.on('unhandledRejection', (error) => {
  console.error('unhandled rejection escaped the plugin:', error)
  process.exit(1)
})


// 主 agent 的核对上限与子代理自己的上限分开配置。
await call('POST', '/config', { values: { deepsearchSubagentToolCalls: 12 } })
const capped = await call('POST', '/panel/deepsearch', { query: 'cap check', rounds: 1 })
assert.equal(capped.status, 200)
const cappedPrompt = sessionPrompts[sessionPrompts.length - 1].content[0].text
assert.match(cappedPrompt, /每个子代理自己的检索\/抓取工具调用不超过 12 次/, 'per-subagent cap reaches the prompt')
assert.match(cappedPrompt, /补充关键信息/, 'verification line mentions filling gaps')
assert.equal(/硬凑/.test(cappedPrompt), false, 'duplicated source rule dropped from the prompt')
await call('POST', '/config', { values: { deepsearchSubagentToolCalls: 0 } })
const uncapped = await call('POST', '/panel/deepsearch', { query: 'no cap check', rounds: 1 })
assert.equal(uncapped.status, 200)
assert.equal(/每个子代理自己的检索/.test(sessionPrompts[sessionPrompts.length - 1].content[0].text), false, 'per-subagent cap omitted when unlimited')

console.log('smoke ok')
