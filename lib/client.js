/**
 * dsh-deepsearch — web half.
 *
 * Registers the right-sidebar tab (better-sidebar when available, native
 * slots otherwise) and renders the agent / deepsearch / history / config pages.
 * No build step: plain React elements through the harness module loader.
 */
window.__ModuleLoader__.load({
  id: 'dsh-deepsearch',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useRef, useState } = React

    const NS = 'dsh-deepsearch'
    const PANEL_ID = 'dsh-deepsearch'
    const BASE = '/dsh-deepsearch'

    // -----------------------------------------------------------------------
    // style
    // -----------------------------------------------------------------------

    const S = {
      page: {
        height: '100%',
        overflow: 'auto',
        maxWidth: 980,
        margin: '0 auto',
        // No top padding: the header block is sticky and draws its own, so
        // scrolling never shows an uncoloured strip above it.
        padding: '0 16px 40px',
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-base)',
        fontSize: 13,
        lineHeight: 1.55,
        boxSizing: 'border-box',
        width: '100%',
      },
      head: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
      stickyTop: {
        position: 'sticky',
        top: 0,
        zIndex: 30,
        margin: '0 -16px',
        padding: '10px 16px 6px',
        background: 'var(--dsw-alias-bg-base)',
        borderBottom: '1px solid var(--dsw-alias-border-l1)',
      },
      h1: { fontSize: 18, fontWeight: 650, margin: 0, letterSpacing: '.01em' },
      grow: { flex: 1 },
      button: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 7,
        padding: '5px 11px',
        fontSize: 12,
        cursor: 'pointer',
      },
      primary: {
        // Ghost style on purpose: a solid brand fill renders white-on-white
        // with light accents.
        border: '1px solid var(--dsw-alias-brand-primary)',
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        fontWeight: 600,
        borderRadius: 7,
        padding: '5px 11px',
        fontSize: 12,
        cursor: 'pointer',
      },
      tabs: { display: 'flex', gap: 4, borderBottom: '1px solid var(--dsw-alias-border-l1)', marginBottom: 12 },
      tab: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        padding: '7px 10px',
        fontSize: 13,
        cursor: 'pointer',
        borderBottom: '2px solid transparent',
      },
      tabActive: { color: 'var(--dsw-alias-label-primary)', borderBottom: '2px solid var(--dsw-alias-brand-primary)' },
      card: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        borderRadius: 10,
        padding: '12px 14px',
        marginBottom: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      },
      cardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
      cardTitle: { fontSize: 14, fontWeight: 600 },
      cardHint: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: 1.5, marginBottom: 8 },
      configRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 0',
        borderTop: '1px solid var(--dsw-alias-border-l1)',
      },
      configText: { flex: 1, minWidth: 0 },
      configLabel: { fontSize: 13 },
      configNote: { color: 'var(--dsw-alias-label-secondary)', fontSize: 11.5, lineHeight: 1.45, marginTop: 2 },
      warning: { color: 'var(--dsw-alias-state-warning-primary, #d97706)', fontSize: 12, lineHeight: 1.5, marginTop: 2, marginBottom: 6 },
      configControl: { flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
      row: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
      label: { color: 'var(--dsw-alias-label-secondary)' },
      muted: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      mono: { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: 12 },
      input: {
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 6,
        padding: '6px 8px',
        fontFamily: 'inherit',
        fontSize: 12,
        lineHeight: 1.5,
        resize: 'vertical',
      },
      select: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
        borderRadius: 6,
        padding: '3px 6px',
        fontSize: 12,
      },
      pill: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 999,
        padding: '0 8px',
        fontSize: 11,
        color: 'var(--dsw-alias-label-secondary)',
      },
      err: { color: 'var(--dsw-alias-state-error-primary)', fontSize: 12, wordBreak: 'break-word' },
      listItem: { borderBottom: '1px solid var(--dsw-alias-border-l1)', padding: '8px 0' },
      link: { color: '#3b82f6', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', wordBreak: 'break-word' },
      code: {
        background: 'var(--dsw-alias-bg-layer-2)',
        borderRadius: 4,
        padding: '0 4px',
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        fontSize: 12,
      },
      pre: {
        background: 'var(--dsw-alias-bg-layer-2)',
        borderRadius: 6,
        padding: '8px 10px',
        overflowX: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
        fontSize: 12,
        margin: '0 0 10px',
      },
      table: { width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 12 },
      th: {
        textAlign: 'left',
        borderBottom: '1px solid var(--dsw-alias-border-l1)',
        padding: '4px 6px',
        color: 'var(--dsw-alias-label-secondary)',
        fontWeight: 600,
      },
      td: { borderBottom: '1px solid var(--dsw-alias-border-l1)', padding: '4px 6px', verticalAlign: 'top' },
      md: { fontSize: 13, lineHeight: 1.62, wordBreak: 'break-word' },
      mdP: { margin: '0 0 8px', whiteSpace: 'pre-wrap' },
      mdHead: { fontSize: 14, fontWeight: 600, margin: '14px 0 6px' },
      mdHeadBig: { fontSize: 16, margin: '4px 0 10px' },
      mdList: { margin: '0 0 8px', paddingLeft: 8 },
      dots: {
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--dsw-alias-brand-primary)',
        marginRight: 6,
      },
    }

    // -----------------------------------------------------------------------
    // i18n
    // -----------------------------------------------------------------------

    const DICT = {
      zh: {
        title: '深度搜索',
        tabDesc: '深度搜索、检索子代理与历史',
        nav: '深度搜索',
        tabSearch: '搜索',
        tabAgent: 'Agent 搜索',
        tabDeepsearch: '深度搜索',
        tabHistory: '历史',
        tabConfig: '配置',
        cfg_deepsearchEnabled: 'deepsearch 工具',
        tabAll: '全部',
        contextAccessOn: '会读本地资料',
        run: '搜索',
        running: '检索中…',
        agentPhrase: '用一句自然语言描述你要查什么',
        agentHint: '在左侧栏「深度搜索」工作区新建一个会话，让检索 agent 在独立上下文里完成检索，这里同步显示结果。',
        ask: '检索',
        thinking: '检索 agent 正在工作…',
        deepsearchPhrase: '输入要深度搜索的主题，例如「2026 年前端构建工具怎么选」',
        roundsLabel: '轮数',
        roundProgress: '正在跑第',
        reportsTitle: '各轮报告',
        deepsearching: '深度搜索中…',
        deepsearchRunning: '深度搜索会持续几分钟，可以切到别的页签；跑完结果会留在这里。',
        reportPath: '报告',
        copy: '复制',
        copied: '已复制',
        saveDesktop: '保存到桌面',
        savingDesktop: '保存中…',
        savedDesktop: '已保存到桌面',
        saveDesktopFailed: '保存到桌面失败',
        continueRound: '再搜一轮',
        continuing: '继续中…',
        continueFailed: '再搜一轮失败',
        elapsed: '耗时',
        historyEmpty: '还没有记录。',
        clearHistory: '清空历史',
        cancel: '取消',
        confirmClear: '确定清空全部搜索历史？',
        failed: '失败',
        errorLabel: '错误',
        configSaved: '已保存',
        save: '保存',
        dataRoot: '数据目录',
        workspace: '深度搜索工作区',
        attachLog: '挂载记录',
        errors: '最近错误',
        noErrors: '无',
        runningBanner: '上一次运行还在进行，完成后会出现在历史里',
        recovering: '连接中断；正在核对报告是否已经落盘…',
        session: '会话',
        sessionHint: '这次检索是左侧栏「{title}」工作区里的一个会话，点开可以继续追问。',
        methodsTitle: '调查方法',
        methodsHint: '深度搜索会话开头注入的方法笔记。',
        methodsSave: '保存',
        methodsSaved: '已保存',
        methodsChars: '字符',
        configOnAgent: 'Agent 搜索设置',
        configOnDeepsearch: '深度搜索设置',
        methodsOffHint: '关闭时不注入任何调查方法；打开后编辑插件自带的调查方法，下一次深度搜索生效。',
        configGeneral: '通用设置',
        configGeneralHint: '工作区、历史、数据目录、全局超时与调试；工具与方法笔记见下方卡片。',
        diagTitle: '运行信息与诊断',
        diagHint: '只读信息，不参与配置保存。',
        cfg_workspaceId: '工作区',
        workspaceAuto: '自动：深度搜索工作区',
        cfg_maxToolCalls: '工具调用上限',
        cfg_panelAgentTimeoutSec: 'Agent 搜索超时（秒）',
        cfg_searchReasoningEffort: 'Agent search reasoning',
        agentReasoning: 'Reasoning',
        cfg_historyLimit: '历史保留条数',
        cfg_dataRoot: '数据目录',
        cfg_reportDir: '报告目录',
        cfg_deepsearchTimeoutSec: '深度搜索超时（秒）',
        cfg_deepsearchReasoningEffort: '深度搜索思考强度',
        cfg_deepsearchToolCalls: '检索调用上限',
        cfg_deepsearchMaxChars: '报告最大字符',
        cfg_deepsearchPtc: 'PTC 模式',
        cfg_deepsearchCompress: '允许压缩上下文',
        cfg_noTimeout: '不限时间',
        cfg_deepsearchSummaryChars: '回传摘要字数',
        cfg_deepsearchSubagents: '并行子代理',
        cfg_deepsearchBriefWords: '子代理简报字数',
        cfg_referencePaths: '本地资料路径',
        cfg_referenceEnabled: '读本地资料',
        referenceNoPaths: '每行一个绝对路径（文件或目录）；留空则不读。',
        cfg_deepsearchWorkspaceToolEnabled: '雷霆大搜索',
        cfg_deepsearchWorkspaceUnlimited: '限制解除',
        workspaceWarning:
          '注意：工作区里的 agent 和子代理都可能继续调用 deepsearch，递归深度不可控，可能消耗大量时间与 tokens。工作区内调用固定只跑 1 轮，但仍可能拖住上游。',
        workspaceWarningUnlimited:
          '注意：工作区里的 agent 和子代理都可能继续调用 deepsearch，递归深度不可控，可能消耗大量时间与 tokens。已解除 1 轮限制，工作区内的调用会按请求的轮数跑。',
        cfg_deepsearchRounds: '默认轮数',
        cfg_debug: '调试日志',
      },
      en: {
        title: 'Deep Search',
        tabDesc: 'Deep search, retrieval agents and history',
        nav: 'Deep Search',
        tabSearch: 'Search',
        tabAgent: 'Agent search',
        tabDeepsearch: 'Deep Search',
        tabHistory: 'History',
        tabConfig: 'Config',
        cfg_deepsearchEnabled: 'deepsearch tool',
        tabAll: 'All',
        contextAccessOn: 'Local files enabled',
        run: 'Search',
        running: 'Searching…',
        agentPhrase: 'Describe what you need in plain language',
        agentHint: 'Starts a fresh retrieval agent in a dedicated search workspace, without this conversation context, and returns Markdown.',
        ask: 'Ask',
        thinking: 'The retrieval agent is working…',
        deepsearchPhrase: 'Enter a deep-search topic, e.g. “2026 frontend build tools compared”',
        roundsLabel: 'Rounds',
        roundProgress: 'Round',
        reportsTitle: 'Reports',
        deepsearching: 'Deep searching…',
        deepsearchRunning: 'This can take minutes; switch tabs freely, the result stays here when it finishes.',
        reportPath: 'Report',
        copy: 'Copy',
        copied: 'Copied',
        saveDesktop: 'Save to desktop',
        savingDesktop: 'Saving…',
        savedDesktop: 'Saved to desktop',
        saveDesktopFailed: 'Could not save to desktop',
        continueRound: 'Search another round',
        continuing: 'Continuing…',
        continueFailed: 'Could not continue the search',
        elapsed: 'Elapsed',
        historyEmpty: 'No entries yet.',
        clearHistory: 'Clear history',
        cancel: 'Cancel',
        confirmClear: 'Clear the whole search history?',
        failed: 'failed',
        errorLabel: 'Error',
        configSaved: 'Saved',
        save: 'Save',
        dataRoot: 'Data dir',
        workspace: 'Workspace',
        attachLog: 'Attach log',
        errors: 'Recent errors',
        noErrors: 'none',
        recovering: 'Connection lost; checking whether the report was already saved…',
        session: 'Session',
        sessionHint: 'This run is a real session under the “{title}” workspace in the left sidebar; open it to continue.',
        methodsTitle: 'Deepsearch method',
        methodsHint: 'Method notes injected at the start of a deep-search session.',
        methodsSave: 'Save',
        methodsSaved: 'Saved',
        methodsChars: 'chars',
        configOnAgent: 'Agent search settings',
        configOnDeepsearch: 'Deep search settings',
        methodsOffHint: 'When off, no deepsearch method is injected. Turn it on to edit the bundled method; the next deep search uses it.',
        configGeneral: 'General settings',
        configGeneralHint: 'Workspace, history, data directory, global timeout and debugging; tool and method notes are below.',
        diagTitle: 'Runtime and diagnostics',
        diagHint: 'Read-only information; not part of the saved config.',
        cfg_workspaceId: 'Workspace',
        workspaceAuto: 'Automatic: deep-search workspace',
        cfg_maxToolCalls: 'Tool call limit',
        cfg_panelAgentTimeoutSec: 'Agent search timeout (s)',
        cfg_searchReasoningEffort: 'Agent search reasoning',
        agentReasoning: 'Reasoning',
        cfg_historyLimit: 'History entries',
        cfg_dataRoot: 'Data directory',
        cfg_reportDir: 'Report folder',
        cfg_deepsearchTimeoutSec: 'Deep search timeout (s)',
        cfg_deepsearchReasoningEffort: 'Deep search reasoning',
        cfg_deepsearchToolCalls: 'Retrieval call limit',
        cfg_deepsearchMaxChars: 'Max report chars',
        cfg_deepsearchPtc: 'PTC mode',
        cfg_deepsearchCompress: 'Allow context compression',
        cfg_noTimeout: 'No time limit',
        cfg_deepsearchSummaryChars: 'Summary chars',
        cfg_deepsearchSubagents: 'Parallel subagents',
        cfg_deepsearchBriefWords: 'Brief words per subagent',
        cfg_referencePaths: 'Local file paths',
        cfg_referenceEnabled: 'Read local files',
        referenceNoPaths: 'One absolute file or directory per line; leave empty to disable.',
        cfg_deepsearchWorkspaceToolEnabled: 'Thunder Search',
        cfg_deepsearchWorkspaceUnlimited: 'Remove the 1-round cap',
        workspaceWarning:
          'Warning: agents and subagents in this workspace can call deepsearch again, so recursion depth is unbounded and may consume hours and tokens. Calls from this workspace are capped at one round, but can still block upstream work.',
        workspaceWarningUnlimited:
          'Warning: agents and subagents in this workspace can call deepsearch again, so recursion depth is unbounded and may consume hours and tokens. The 1-round cap is lifted: calls from this workspace run as many rounds as they ask for.',
        cfg_deepsearchRounds: 'Default rounds',
        cfg_debug: 'Debug log',
      },
    }

    // -----------------------------------------------------------------------
    // http helpers
    // -----------------------------------------------------------------------

    function apiPath(path) {
      const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : 'http://127.0.0.1/'
      const url = new URL(BASE + path, base)
      return url.pathname + url.search
    }

    async function readJson(response) {
      let payload = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      if (!response.ok || (payload && payload.ok === false)) {
        const message = payload && payload.error ? payload.error : `HTTP ${response.status}`
        throw new Error(message)
      }
      return payload
    }

    async function getState() {
      return readJson(await fetch(apiPath('/state'), { cache: 'no-store' }))
    }


    async function getMethods() {
      return readJson(await fetch(apiPath('/methods'), { cache: 'no-store' }))
    }

    async function putMethods(body) {
      return postJson('/methods', { body })
    }

    async function postJson(path, body) {
      return readJson(
        await fetch(apiPath(path), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body || {}),
        }),
      )
    }

    // A link inside the Electron renderer cannot reach the browser on its own;
    // the host half opens it through the OS handler.
    function openLink(url) {
      postJson('/panel/open', { url }).catch(() => {})
    }

    function hostOf(url) {
      try {
        return new URL(url).host
      } catch {
        return ''
      }
    }

    function formatTime(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString()
    }

    function formatDuration(ms) {
      const value = Number(ms) || 0
      if (value < 1000) return `${value} ms`
      return `${(value / 1000).toFixed(1)} s`
    }

    function shortSessionId(id) {
      const text = String(id ?? '').replace(/^session-/, '')
      return text.length > 12 ? `${text.slice(0, 8)}…` : text
    }

    // -----------------------------------------------------------------------
    // markdown
    // -----------------------------------------------------------------------

    const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)/g

    function inline(text, keyPrefix) {
      const out = []
      let index = 0
      let seq = 0
      const prefix = keyPrefix || 'i'
      const source = String(text ?? '')
      INLINE_RE.lastIndex = 0
      let match = INLINE_RE.exec(source)
      while (match) {
        if (match.index > index) out.push(source.slice(index, match.index))
        const token = match[0]
        const key = `${prefix}-${seq}`
        seq += 1
        if (token.startsWith('`')) out.push(h('code', { key, style: S.code }, token.slice(1, -1)))
        else if (token.startsWith('**')) out.push(h('strong', { key }, token.slice(2, -2)))
        else if (token.startsWith('[')) {
          const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token)
          out.push(
            h('a', { key, href: link[2], target: '_blank', rel: 'noreferrer noopener', style: S.link, onClick: (event) => { event.preventDefault(); openLink(link[2]) } }, link[1]),
          )
        } else out.push(h('em', { key }, token.slice(1, -1)))
        index = match.index + token.length
        match = INLINE_RE.exec(source)
      }
      if (index < source.length) out.push(source.slice(index))
      return out
    }

    function splitRow(line) {
      return line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
    }

    function isTableSeparator(line) {
      const trimmed = line.trim()
      return trimmed.includes('|') && trimmed.includes('-') && /^\|?[\s:|-]+\|?$/.test(trimmed)
    }

    function isTableRow(line) {
      return line.trim().includes('|')
    }

    const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/

    function blocks(markdown, keyPrefix) {
      const lines = String(markdown ?? '').replace(/\r\n/g, '\n').split('\n')
      const out = []
      const prefix = keyPrefix || 'b'
      let index = 0
      let seq = 0
      const nextKey = () => `${prefix}-${seq++}`

      while (index < lines.length) {
        const line = lines[index]

        if (/^\s*$/.test(line)) {
          index += 1
          continue
        }

        if (/^\s*```/.test(line)) {
          const body = []
          index += 1
          while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
            body.push(lines[index])
            index += 1
          }
          index += 1
          out.push(h('pre', { key: nextKey(), style: S.pre }, h('code', null, body.join('\n'))))
          continue
        }

        const heading = /^(#{1,4})\s+(.*)$/.exec(line)
        if (heading) {
          const level = heading[1].length
          const style = level <= 2 ? Object.assign({}, S.mdHead, S.mdHeadBig) : S.mdHead
          out.push(h(`h${Math.min(level + 2, 6)}`, { key: nextKey(), style }, inline(heading[2], nextKey())))
          index += 1
          continue
        }

        if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
          out.push(
            h('hr', {
              key: nextKey(),
              style: { border: 'none', borderTop: '1px solid var(--dsw-alias-border-l1)', margin: '10px 0' },
            }),
          )
          index += 1
          continue
        }

        if (isTableRow(line) && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
          const header = splitRow(line)
          index += 2
          const rows = []
          while (index < lines.length && isTableRow(lines[index]) && !isTableSeparator(lines[index])) {
            rows.push(splitRow(lines[index]))
            index += 1
          }
          out.push(
            h(
              'table',
              { key: nextKey(), style: S.table },
              h(
                'thead',
                null,
                h(
                  'tr',
                  null,
                  header.map((cell, cellIndex) => h('th', { key: cellIndex, style: S.th }, inline(cell, `${prefix}-h-${cellIndex}`))),
                ),
              ),
              h(
                'tbody',
                null,
                rows.map((row, rowIndex) =>
                  h(
                    'tr',
                    { key: rowIndex },
                    row.map((cell, cellIndex) =>
                      h('td', { key: cellIndex, style: S.td }, inline(cell, `${prefix}-c-${rowIndex}-${cellIndex}`)),
                    ),
                  ),
                ),
              ),
            ),
          )
          continue
        }

        const listItem = LIST_ITEM.exec(line)
        if (listItem) {
          const ordered = /\d/.test(listItem[2])
          const items = []
          const renderItem = (item) => {
            const indent = Math.min(3, Math.floor(item[1].length / 2))
            return h(
              'li',
              { key: nextKey(), style: { marginLeft: indent * 12, listStyleType: ordered ? 'decimal' : 'disc' } },
              inline(item[3], nextKey()),
            )
          }
          while (index < lines.length) {
            const candidate = LIST_ITEM.exec(lines[index])
            if (!candidate) break
            items.push(renderItem(candidate))
            index += 1
          }
          out.push(h(ordered ? 'ol' : 'ul', { key: nextKey(), style: S.mdList }, items))
          continue
        }

        const quote = /^>\s?(.*)$/.exec(line)
        if (quote) {
          const body = []
          while (index < lines.length) {
            const inner = /^>\s?(.*)$/.exec(lines[index])
            if (!inner) break
            body.push(inner[1])
            index += 1
          }
          out.push(
            h(
              'blockquote',
              {
                key: nextKey(),
                style: {
                  margin: '0 0 8px',
                  paddingLeft: 10,
                  borderLeft: '3px solid var(--dsw-alias-border-l1)',
                  color: 'var(--dsw-alias-label-secondary)',
                },
              },
              blocks(body.join('\n'), nextKey()),
            ),
          )
          continue
        }

        const paragraph = [line]
        index += 1
        while (index < lines.length) {
          const candidate = lines[index]
          if (
            /^\s*$/.test(candidate) ||
            /^(#{1,4})\s/.test(candidate) ||
            /^\s*```/.test(candidate) ||
            LIST_ITEM.test(candidate) ||
            /^>\s?/.test(candidate) ||
            (isTableRow(candidate) && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
          ) {
            break
          }
          paragraph.push(candidate)
          index += 1
        }
        out.push(h('p', { key: nextKey(), style: S.mdP }, inline(paragraph.join('\n'), nextKey())))
      }
      return out
    }

    // -----------------------------------------------------------------------
    // shared bits
    // -----------------------------------------------------------------------

    function Chip(props) {
      return h('span', { style: Object.assign({}, S.pill, props.style) }, props.children)
    }

    function ErrorLine(props) {
      if (!props.text) return null
      return h('div', { style: S.err }, props.text)
    }

    function Busy(props) {
      return h(
        'div',
        { style: Object.assign({}, S.row, S.muted) },
        h('span', { style: Object.assign({}, S.dots, { animation: 'dsh-deepsearch-pulse 1.1s ease-in-out infinite' }) }),
        props.label,
        props.elapsed ? h('span', { style: S.mono }, formatDuration(props.elapsed)) : null,
      )
    }

    function useElapsed(active) {
      const [elapsed, setElapsed] = useState(0)
      const startedAt = useRef(0)
      useEffect(() => {
        if (!active) {
          setElapsed(0)
          return undefined
        }
        startedAt.current = Date.now()
        const timer = setInterval(() => setElapsed(Date.now() - startedAt.current), 500)
        return () => clearInterval(timer)
      }, [active])
      return elapsed
    }

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-deepsearch-style')) return
      const style = document.createElement('style')
      style.id = 'dsh-deepsearch-style'
      style.textContent = '@keyframes dsh-deepsearch-pulse{0%,100%{opacity:.25}50%{opacity:1}}'
      document.head.appendChild(style)
    }

    // Config fields live together on the host; the panel only decides where
    // each one is shown.
    const CONFIG_GROUPS = {
      agent: ['searchReasoningEffort', 'maxToolCalls', 'panelAgentTimeoutSec'],
      deepsearch: [
        'reportDir',
        'deepsearchRounds',
        'deepsearchReasoningEffort',
        'deepsearchMaxChars',
        'deepsearchSubagents',
        'deepsearchBriefWords',
        'deepsearchSummaryChars',
        'deepsearchToolCalls',
        'deepsearchTimeoutSec',
        // The two tool switches answer "who may call deepsearch", so they read
        // last, as rows of this card instead of cards of their own.
        'deepsearchPtc',
        'deepsearchCompress',
        'deepsearchEnabled',
        'deepsearchWorkspaceToolEnabled',
        'deepsearchWorkspaceUnlimited',
      ],
      general: ['workspaceId', 'dataRoot', 'noTimeout', 'debug', 'historyLimit'],
    }
    // These are edited by dedicated controls on the deep search page, not in
    // a generic config card.
    const HIDDEN_CONFIG_KEYS = new Set(['methodBundled', 'referenceEnabled', 'referencePaths'])
    const GROUPED_CONFIG_KEYS = new Set([...Object.values(CONFIG_GROUPS).flat(), ...HIDDEN_CONFIG_KEYS])

    function fieldsFor(data, keys) {
      const byKey = new Map((((data && data.configFields) || [])).map((field) => [field.key, field]))
      return keys.map((key) => byKey.get(key)).filter(Boolean)
    }

    function configFieldsFor(data, keys) {
      const noTimeout = Boolean(data && data.config && data.config.noTimeout)
      return fieldsFor(data, keys).filter((meta) => !(noTimeout && /TimeoutSec$/.test(meta.key)))
    }

    function Switch(props) {
      const on = Boolean(props.checked)
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': on,
          title: props.title || '',
          disabled: Boolean(props.disabled),
          onClick: () => {
            if (!props.disabled && props.onChange) props.onChange(!on)
          },
          style: {
            boxSizing: 'border-box',
            flex: '0 0 auto',
            width: 36,
            height: 20,
            padding: 2,
            border: 0,
            borderRadius: 999,
            background: on ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l3)',
            cursor: props.disabled ? 'default' : 'pointer',
            opacity: props.disabled ? 0.5 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            transition: 'background .12s',
          },
        },
        h('span', {
          style: {
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: on ? 'var(--dsw-alias-label-primary-foreground)' : 'var(--dsw-alias-switch-thumb)',
            transform: on ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform .12s ease',
          },
        }),
      )
    }

    function ReasoningSelect(props) {
      const { value, disabled, onChange } = props
      return h(
        'select',
        {
          style: Object.assign({}, S.select, { width: 120 }),
          value: ['off', 'low', 'high', 'max'].includes(String(value)) ? String(value) : 'low',
          disabled,
          onChange: (event) => onChange(event.target.value),
        },
        ['off', 'low', 'high', 'max'].map((key) => h('option', { key, value: key }, key)),
      )
    }

    function clampTo(value, min, max) {
      const low = min === undefined ? Number.NEGATIVE_INFINITY : min
      const high = max === undefined ? Number.POSITIVE_INFINITY : max
      return Math.min(high, Math.max(low, Math.round(Number(value))))
    }

    function ConfigControl(props) {
      const { t, meta, value, disabled, onChange, data } = props
      if (meta.key === 'workspaceId') {
        const workspaces = (data && data.workspaces) || []
        return h(
          'select',
          {
            style: Object.assign({}, S.select, { width: 260 }),
            value: String(value || ''),
            disabled,
            onChange: (event) => onChange(event.target.value),
          },
          [
            h('option', { key: '', value: '' }, t('workspaceAuto')),
            ...workspaces.map((workspace) =>
              h('option', { key: workspace.id, value: workspace.id }, `${workspace.title} · ${workspace.path}`),
            ),
          ],
        )
      }
      if (meta.key === 'searchReasoningEffort' || meta.key === 'deepsearchReasoningEffort') {
        return h(ReasoningSelect, {
          value: String(value || 'low'),
          disabled,
          onChange,
        })
      }
      if (meta.type === 'boolean') {
        return h(Switch, { checked: Boolean(value), disabled, onChange })
      }
      if (meta.type === 'number') {
        return h('input', {
          style: Object.assign({}, S.input, { width: 104, padding: '5px 7px' }),
          type: 'number',
          value: String(value ?? ''),
          disabled,
          min: meta.min,
          max: meta.max,
          onChange: (event) => onChange(event.target.value === '' ? 0 : Number(event.target.value)),
          onBlur: (event) => {
            const text = String(event.target.value ?? '').trim()
            const parsed = Number(text)
            if (!text.length || !Number.isFinite(parsed)) return
            const next = clampTo(parsed, meta.min, meta.max)
            if (next === parsed) return
            event.target.value = String(next)
            onChange(next)
          },
        })
      }
      if (meta.key === 'referencePaths') {
        return h('textarea', {
          style: Object.assign({}, S.input, S.mono, { width: 260, minHeight: 52, padding: '5px 7px', resize: 'vertical' }),
          rows: 2,
          placeholder: '/path/to/notes.md',
          value: String(value ?? ''),
          disabled,
          onChange: (event) => onChange(event.target.value),
        })
      }
      return h('input', {
        style: Object.assign({}, S.input, { width: 260, padding: '5px 7px' }),
        type: 'text',
        value: String(value ?? ''),
        disabled,
        onChange: (event) => onChange(event.target.value),
      })
    }

    function ConfigRow(props) {
      const { t, meta, value, disabled, onChange, data } = props
      return h(
        'div',
        { style: S.configRow },
        h(
          'div',
          { style: S.configText },
          h('div', { style: S.configLabel }, t(`cfg_${meta.key}`)),
          meta.note ? h('div', { style: S.configNote }, meta.note) : null,
        ),
        h('div', { style: S.configControl }, h(ConfigControl, { t, meta, value, disabled, onChange, data })),
      )
    }

    // Turning the workspace switch on lets a deepsearch run call deepsearch
    // again; the recursion is capped, but the cost is not, so say so in place.
    function RecursionWarning(props) {
      const { t, meta, value, unlimited } = props
      if (meta.key !== 'deepsearchWorkspaceToolEnabled' || !value) return null
      return h('div', { style: S.warning }, t(unlimited ? 'workspaceWarningUnlimited' : 'workspaceWarning'))
    }

    function ConfigCard(props) {
      const { t, title, hint, fields, values, onSaved, data } = props
      const initial = () => {
        const out = {}
        for (const meta of fields) out[meta.key] = values ? values[meta.key] : undefined
        return out
      }
      const [draft, setDraft] = useState(null)
      const [busy, setBusy] = useState(false)
      const [flash, setFlash] = useState('')
      const [error, setError] = useState('')
      // Mount happens before /state arrives, so an eager initializer would
      // freeze every field at `undefined` and a later save would overwrite
      // the untouched ones. Keep the draft null until the first edit.
      // A field can be filtered out of `fields` (noTimeout hides timeouts), so
      // start from the loaded values: a row that comes back must show its value
      // instead of an empty box.
      const current = draft ? Object.assign(initial(), draft) : initial()
      const ready = Boolean(values && Object.keys(values).length > 0)

      const set = (key, value) => setDraft(Object.assign({}, current, { [key]: value }))
      const dirty = fields.some((meta) => current[meta.key] !== (values ? values[meta.key] : undefined))

      const save = async () => {
        if (!ready || !dirty || busy) return
        setBusy(true)
        setError('')
        try {
          // Post only what changed: sending the whole draft would write back the
          // values this panel loaded before someone else edited them.
          const changed = {}
          for (const meta of fields) {
            if (current[meta.key] === undefined) continue
            if (current[meta.key] === (values ? values[meta.key] : undefined)) continue
            changed[meta.key] = current[meta.key]
          }
          await postJson('/config', { values: changed })
          setFlash(t('configSaved'))
          if (onSaved) onSaved()
          setTimeout(() => setFlash(''), 2000)
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure))
        } finally {
          setBusy(false)
        }
      }

      return h(
        'div',
        { style: S.card },
        h(
          'div',
          { style: S.cardHead },
          h('div', { style: S.cardTitle }, title),
          h('span', { style: S.grow }),
          flash ? h('span', { style: S.muted }, flash) : null,
          h('button', { type: 'button', style: S.primary, disabled: busy || !dirty || !ready, onClick: save }, t('save')),
        ),
        hint ? h('div', { style: S.cardHint }, hint) : null,
        fields
          .filter((meta) => !(meta.key === 'deepsearchWorkspaceUnlimited' && !current.deepsearchWorkspaceToolEnabled))
          .flatMap((meta) => {
            const row = h(ConfigRow, {
              key: meta.key,
              t,
              meta,
              value: current[meta.key],
              disabled: busy,
              data,
              onChange: (value) => set(meta.key, value),
            })
            const warning = h(RecursionWarning, {
              key: `${meta.key}-warning`,
              t,
              meta,
              value: current[meta.key],
              unlimited: current.deepsearchWorkspaceUnlimited,
            })
            return warning ? [row, warning] : [row]
          }),
        h(ErrorLine, { text: error }),
      )
    }

    // -----------------------------------------------------------------------
    // pages
    // -----------------------------------------------------------------------

    function AgentPage(props) {
      const { t, data, refresh } = props
      const [query, setQuery] = useState('')
      const [busy, setBusy] = useState(false)
      const [result, setResult] = useState(null)
      const [error, setError] = useState('')
      const [copied, setCopied] = useState(false)
      const elapsed = useElapsed(busy)

      const run = async () => {
        const text = query.trim()
        if (!text || busy) return
        setBusy(true)
        setError('')
        setCopied(false)
        try {
          const payload = await postJson('/panel/agent', { query: text })
          setResult(payload.entry)
          refresh()
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure))
        } finally {
          setBusy(false)
        }
      }

      const copy = async () => {
        if (!result || typeof navigator === 'undefined' || !navigator.clipboard) return
        try {
          await navigator.clipboard.writeText(result.markdown || '')
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* ignore */
        }
      }

      const workspace = (data && data.workspace) || ''

      return h(
        'div',
        null,
        h(
          'div',
          { style: S.card },
          h('textarea', {
            style: Object.assign({}, S.input, { minHeight: 76 }),
            rows: 4,
            placeholder: t('agentPhrase'),
            value: query,
            onChange: (event) => setQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                run()
              }
            },
          }),
          h(
            'div',
            { style: Object.assign({}, S.row, { marginTop: 8, marginBottom: 0 }) },
            h('span', { style: S.grow }),
            h('button', { type: 'button', style: S.primary, disabled: busy || !query.trim(), onClick: run }, busy ? t('running') : t('run')),
          ),
          busy ? h(Busy, { label: t('thinking'), elapsed }) : null,
          h(ErrorLine, { text: error }),
        ),
        result
          ? h(
              'div',
              { style: S.card },
              h(
                'div',
                { style: Object.assign({}, S.row, S.muted) },
                result.provider ? h(Chip, null, result.provider) : null,
                h('span', null, `${t('elapsed')} ${formatDuration(result.ms)}`),
                h('span', { style: S.grow }),
                h('button', { type: 'button', style: S.button, onClick: copy }, copied ? t('copied') : t('copy')),
              ),
              result.sessionId
                ? h(
                    'div',
                    { style: Object.assign({}, S.muted, { marginBottom: 8, lineHeight: 1.5 }) },
                    `${t('session')} · ${result.workspaceTitle ? `${result.workspaceTitle} / ` : ''}${shortSessionId(result.sessionId)}`,
                    h('div', { style: { marginTop: 2 } }, t('sessionHint').replace('{title}', result.workspaceTitle || '深度搜索')),
                  )
                : null,
              h('div', { style: S.md }, blocks(result.markdown || '')),
            )
          : null,
        h(ConfigCard, {
          t,
          title: t('configOnAgent'),
          fields: configFieldsFor(data, CONFIG_GROUPS.agent),
          values: (data && data.config) || {},
          onSaved: refresh,
          data,
        }),
      )
    }

    function DeepsearchPage(props) {
      const { t, data, refresh } = props
      const [topic, setTopic] = useState('')
      const [rounds, setRounds] = useState(() => Number((data && data.config && data.config.deepsearchRounds) || 1))
      const referencePaths = String((data && data.config && data.config.referencePaths) || '').trim()
      const configuredReference = !(data && data.config && data.config.referenceEnabled === false)
      const [referenceOverride, setReferenceOverride] = useState(null)
      const referenceOn = referenceOverride === null ? configuredReference : referenceOverride
      const [pathDraft, setPathDraft] = useState(referencePaths)
      useEffect(() => setPathDraft(referencePaths), [referencePaths])
      const savePath = async () => {
        const next = String(pathDraft || '').trim()
        if (next === referencePaths) return
        setError('')
        try {
          await postJson('/config', { values: { referencePaths: next } })
          refresh()
        } catch (failure) {
          setError(String(failure && failure.message ? failure.message : failure))
        }
      }
      const useContext = referenceOn && Boolean(referencePaths)
      const [busy, setBusy] = useState(false)
      const [result, setResult] = useState(null)
      const [error, setError] = useState('')
      const [copied, setCopied] = useState(false)
      const [exporting, setExporting] = useState(false)
      const [exported, setExported] = useState('')
      const [pending, setPending] = useState(null)
      const elapsed = useElapsed(busy)
      const active = data && data.activeRun
      const roundCount = Math.max(1, Math.min(10, Math.floor(Number(rounds) || 1)))

      const run = async () => {
        const text = topic.trim()
        if (!text || busy) return
        setBusy(true)
        setError('')
        setCopied(false)
        setExported('')
        const started = Date.now()
        try {
          const payload = await postJson('/panel/deepsearch', {
            query: text,
            outputDir: '',
            useContext,
            rounds: roundCount,
          })
          setResult(payload.entry)
          setPending(null)
          refresh()
        } catch (failure) {
          setPending({ topic: text, since: started })
          setError(t('recovering'))
        } finally {
          setBusy(false)
        }
      }

      useEffect(() => {
        if (!pending) return undefined
        let stopped = false
        const check = async () => {
          try {
            const state = await getState()
            const item = ((state && state.history) || []).find(
              (entry) => entry.mode === 'deepsearch' && entry.query === pending.topic && entry.reportPath && Date.parse(entry.at) >= pending.since,
            )
            if (!item || stopped) return
            const payload = await postJson('/panel/entry', { id: item.id })
            if (stopped) return
            setResult(payload.entry)
            setPending(null)
            setError('')
            refresh()
          } catch {
            /* keep checking while the host is still finishing */
          }
        }
        check()
        const timer = setInterval(check, 3000)
        return () => {
          stopped = true
          clearInterval(timer)
        }
      }, [pending, refresh])

      const setReference = async (next) => {
        setReferenceOverride(next)
        try {
          await postJson('/config', { values: { referenceEnabled: next } })
          refresh()
        } catch (failure) {
          setReferenceOverride(!next)
          setError(String(failure && failure.message ? failure.message : failure))
        }
      }

      const copy = async () => {
        if (!result || typeof navigator === 'undefined' || !navigator.clipboard) return
        try {
          await navigator.clipboard.writeText(result.markdown || '')
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* ignore */
        }
      }

      const saveDesktop = async () => {
        if (!result || exporting) return
        const paths = [result.reportPath, ...(Array.isArray(result.reports) ? result.reports.map((item) => item.path) : [])].filter(Boolean)
        if (paths.length === 0) return
        setExporting(true)
        try {
          const payload = await postJson('/panel/export', { paths })
          setExported(String(payload.dir || (Array.isArray(payload.paths) ? payload.paths[0] : '') || ''))
        } catch (failure) {
          setError(`${t('saveDesktopFailed')}：${failure && failure.message ? failure.message : failure}`)
        } finally {
          setExporting(false)
        }
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: S.card },
          h('textarea', {
            style: Object.assign({}, S.input, { minHeight: 76 }),
            rows: 3,
            placeholder: t('deepsearchPhrase'),
            value: topic,
            onChange: (event) => setTopic(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                run()
              }
            },
          }),
          h(
            'div',
            { style: Object.assign({}, S.row, { marginTop: 6, flexWrap: 'wrap', gap: 6 }) },
            h('span', { style: S.muted }, t('roundsLabel')),
            [1, 2, 3].map((value) =>
              h(
                'button',
                {
                  key: value,
                  type: 'button',
                  style: roundCount === value ? S.primary : S.button,
                  onClick: () => setRounds(value),
                },
                String(value),
              ),
            ),
            h(
              'button',
              {
                type: 'button',
                style: roundCount > 3 ? S.primary : S.button,
                onClick: () => setRounds(4),
              },
              '4+',
            ),
            roundCount > 3
              ? h('input', {
                  type: 'number',
                  min: 4,
                  max: 10,
                  step: 1,
                  style: Object.assign({}, S.input, { width: 84 }),
                  value: rounds,
                  onChange: (event) => setRounds(event.target.value),
                  onBlur: () => setRounds(Math.max(4, Math.min(10, Math.floor(Number(rounds) || 4)))),
                })
              : null,
            h('span', { style: S.grow }),
            h('button', { type: 'button', style: S.primary, disabled: busy || !topic.trim(), onClick: run }, busy ? t('running') : t('run')),
          ),
          h(
            'div',
            { style: Object.assign({}, S.row, { marginTop: 4, gap: 8, alignItems: 'center' }) },
            h('span', { style: S.muted }, t('cfg_referenceEnabled')),
            h(Switch, { checked: referenceOn, onChange: setReference }),
          ),
          referenceOn
            ? h(
                'div',
                { style: { marginTop: 6 } },
                h('div', { style: Object.assign({}, S.muted, { marginBottom: 4 }) }, t('cfg_referencePaths')),
                h('textarea', {
                  style: Object.assign({}, S.input, S.mono, {
                    width: '100%',
                    boxSizing: 'border-box',
                    minHeight: 52,
                    padding: '5px 7px',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }),
                  rows: 2,
                  value: pathDraft,
                  placeholder: t('referenceNoPaths'),
                  onChange: (event) => setPathDraft(event.target.value),
                  onBlur: savePath,
                }),
              )
            : null,
          busy ? h(Busy, { label: t('deepsearching'), elapsed }) : null,
          busy && active && active.round
            ? h('div', { style: Object.assign({}, S.muted, { marginTop: 6 }) }, `${t('roundProgress')} ${active.round}/${active.rounds || roundCount}`)
            : null,
          busy ? h('div', { style: Object.assign({}, S.muted, { marginTop: 6 }) }, t('deepsearchRunning')) : null,
          h(ErrorLine, { text: error }),
        ),
        result
          ? h(
              'div',
              { style: S.card },
              h(
                'div',
                { style: Object.assign({}, S.row, S.muted) },
                result.provider ? h(Chip, null, result.provider) : null,
                h('span', null, `${t('elapsed')} ${formatDuration(result.ms)}`),
                h('span', { style: S.grow }),
                h('button', { type: 'button', style: S.button, onClick: copy }, copied ? t('copied') : t('copy')),
                result.reportPath
                  ? h(
                      'button',
                      { type: 'button', style: S.button, disabled: exporting, onClick: saveDesktop },
                      exporting ? t('savingDesktop') : t('saveDesktop'),
                    )
                  : null,
              ),
              exported
                ? h('div', { style: Object.assign({}, S.muted, { marginBottom: 6 }) }, `${t('savedDesktop')} · ${exported}`)
                : null,
              result.useContext
                ? h('div', { style: Object.assign({}, S.muted, { marginBottom: 6 }) }, t('contextAccessOn'))
                : null,
              Array.isArray(result.reports) && result.reports.length > 1
                ? h(
                    'div',
                    { style: Object.assign({}, S.muted, { marginBottom: 8, lineHeight: 1.7 }) },
                    `${t('reportsTitle')} · ${result.reports.length}`,
                    ...result.reports.map((item) =>
                      h('div', { style: S.mono }, `第 ${item.round || ''} 轮 · ${item.path || item}`),
                    ),
                  )
                : null,
              result.reportPath
                ? h(
                    'div',
                    { style: Object.assign({}, S.muted, { marginBottom: 8, lineHeight: 1.6 }) },
                    `${t('reportPath')} · `,
                    h('span', { style: S.mono }, result.reportPath),
                  )
                : null,
              result.sessionId
                ? h(
                    'div',
                    { style: Object.assign({}, S.muted, { marginBottom: 8, lineHeight: 1.5 }) },
                    `${t('session')} · ${result.workspaceTitle ? `${result.workspaceTitle} / ` : ''}${shortSessionId(result.sessionId)}`,
                  )
                : null,
              h('div', { style: S.md }, blocks(result.markdown || '')),
            )
          : null,
        h(
          'div',
          { style: { marginTop: 12 } },
          h(ConfigCard, {
            t,
            title: t('configOnDeepsearch'),
            fields: configFieldsFor(data, CONFIG_GROUPS.deepsearch),
            values: (data && data.config) || {},
            onSaved: refresh,
            data,
          }),
        ),
        h(MethodsCard, { t, data, refresh }),
      )
    }

    function HistoryPage(props) {
      const { t, data, refresh } = props
      useEffect(() => { refresh() }, [refresh])
      const [mode, setMode] = useState('all')
      const [open, setOpen] = useState('')
      const [full, setFull] = useState({})
      const [busy, setBusy] = useState(false)
      const [confirming, setConfirming] = useState(false)
      const [savingId, setSavingId] = useState('')
      const [continuingId, setContinuingId] = useState('')
      const [saved, setSaved] = useState({})
      const history = (data && data.history) || []
      const kindOf = (entry) => (entry.mode === 'agent' ? 'agent' : entry.mode === 'deepsearch' ? 'deepsearch' : 'search')
      const counts = { all: history.length, agent: 0, deepsearch: 0 }
      for (const entry of history) {
        const kind = kindOf(entry)
        if (kind in counts) counts[kind] += 1
      }
      const visible = mode === 'all' ? history : history.filter((entry) => kindOf(entry) === mode)

      // /state carries only what the list shows; one click pulls the full text.
      const toggle = (id) => {
        if (open === id) {
          setOpen('')
          return
        }
        setOpen(id)
        if (full[id]) return
        postJson('/panel/entry', { id })
          .then((next) => {
            if (next && next.entry) setFull((current) => Object.assign({}, current, { [id]: next.entry }))
          })
          .catch(() => {})
      }

      // window.confirm does nothing inside the Electron renderer, so the
      // confirmation is rendered in the panel itself.
      const clear = async () => {
        setConfirming(false)
        setBusy(true)
        try {
          await postJson('/panel/clear', {})
          refresh()
        } catch {
          /* ignore */
        } finally {
          setBusy(false)
        }
      }

      const loadEntry = async (entry) => {
        const cached = full[entry.id]
        if (cached && cached.markdown) return cached
        const payload = await postJson('/panel/entry', { id: entry.id })
        if (payload && payload.entry) {
          setFull((current) => Object.assign({}, current, { [entry.id]: payload.entry }))
          return payload.entry
        }
        return entry
      }

      const saveEntry = async (entry) => {
        setSavingId(entry.id)
        try {
          const detail = await loadEntry(entry)
          const paths = [detail.reportPath, ...(Array.isArray(detail.reports) ? detail.reports.map((item) => item.path) : [])].filter(Boolean)
          const payload = paths.length > 0
            ? await postJson('/panel/export', { paths })
            : await postJson('/panel/export', { id: entry.id })
          setSaved((current) => Object.assign({}, current, { [entry.id]: `${t('savedDesktop')} · ${payload.dir || ''}` }))
        } catch (failure) {
          setSaved((current) => Object.assign({}, current, { [entry.id]: `${t('saveDesktopFailed')}：${failure && failure.message ? failure.message : failure}` }))
        } finally {
          setSavingId('')
        }
      }

      const continueEntry = async (entry) => {
        if (continuingId) return
        setContinuingId(entry.id)
        setSaved((current) => {
          const next = Object.assign({}, current)
          delete next[entry.id]
          return next
        })
        try {
          const payload = await postJson('/panel/continue', { id: entry.id })
          if (payload && payload.entry) {
            setFull((current) => Object.assign({}, current, { [payload.entry.id]: payload.entry }))
            setOpen(payload.entry.id)
          }
          refresh()
        } catch (failure) {
          setSaved((current) => Object.assign({}, current, {
            [entry.id]: `${t('continueFailed')}：${failure && failure.message ? failure.message : failure}`,
          }))
        } finally {
          setContinuingId('')
        }
      }

      // A deep-search entry can contain several rounds. Keep them in one card,
      // but render every report body; listing only paths made the earlier rounds
      // look as if they had been lost.
      const renderReportBody = (entry) => {
        const detail = full[entry.id] || entry
        const bodies = Array.isArray(detail.reportBodies) ? detail.reportBodies : []
        const multi = Boolean(entry.continuous) || (Array.isArray(entry.reports) && entry.reports.length > 1)
        if (multi && bodies.length > 0) {
          return h(
            'div',
            null,
            h('div', { style: Object.assign({}, S.muted, { marginBottom: 6 }) }, `${t('reportsTitle')} · ${bodies.length}`),
            ...bodies.map((item, index) =>
              h(
                'div',
                {
                  key: index,
                  style: index > 0
                    ? { marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dsw-alias-border-l1)' }
                    : null,
                },
                h('div', { style: { fontWeight: 600 } }, `第 ${item.round || index + 1} 轮${item.title ? ` · ${item.title}` : ''}`),
                item.path ? h('div', { style: Object.assign({}, S.muted, S.mono, { wordBreak: 'break-all', marginTop: 2 }) }, item.path) : null,
                item.error
                  ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary)', marginTop: 4 } }, item.error)
                  : h('div', { style: S.md }, blocks(String(item.markdown || ''))),
              ),
            ),
          )
        }
        return h(
          'div',
          null,
          Array.isArray(entry.reports) && entry.reports.length > 0
            ? h(
                'div',
                { style: { marginBottom: 6 } },
                h('div', { style: S.muted }, `${t('reportsTitle')} · ${entry.reports.length}`),
                ...entry.reports.map((item, index) =>
                  h(
                    'div',
                    { key: index, style: Object.assign({}, S.muted, S.mono, { lineHeight: 1.7 }) },
                    `第 ${item.round || index + 1} 轮 · ${item.path || item}`,
                  ),
                ),
              )
            : entry.reportPath
              ? h(
                  'div',
                  { style: Object.assign({}, S.muted, S.mono, { marginBottom: 6 }) },
                  `${t('reportPath')} · ${entry.reportPath}`,
                )
              : null,
          h('div', { style: S.md }, blocks(detail.markdown || '')),
        )
      }

      return h(
        'div',
        null,
        h(
          'div',
          { style: Object.assign({}, S.tabs, { marginBottom: 8, alignItems: 'center' }) },
          [
            ['all', t('tabAll')],
            ['agent', t('tabAgent')],
            ['deepsearch', t('tabDeepsearch')],
          ].map(([key, label]) =>
            h(
              'button',
              {
                key,
                type: 'button',
                style: Object.assign({}, S.tab, mode === key ? S.tabActive : null),
                onClick: () => setMode(key),
              },
              `${label} ${counts[key]}`,
            ),
          ),
          h('span', { style: S.grow }),
          confirming
            ? h(
                'span',
                { style: S.row },
                h('span', { style: S.muted }, t('confirmClear')),
                h('button', { type: 'button', style: S.button, disabled: busy, onClick: clear }, t('clearHistory')),
                h('button', { type: 'button', style: S.button, onClick: () => setConfirming(false) }, t('cancel')),
              )
            : h('button', { type: 'button', style: S.button, disabled: busy || history.length === 0, onClick: () => setConfirming(true) }, t('clearHistory')),
        ),
        visible.length === 0 ? h('div', { style: S.muted }, t('historyEmpty')) : null,
        visible.map((entry) =>
          h(
            'div',
            {
              key: entry.id,
              style: Object.assign({}, S.card, { marginBottom: 8, cursor: 'pointer' }),
              onClick: (event) => {
                const target = event && event.target
                if (target && typeof target.closest === 'function' && target.closest('a,button')) return
                toggle(entry.id)
              },
            },
            h(
              'div',
              { style: Object.assign({}, S.row, { marginBottom: 2 }) },
              h(Chip, null, entry.mode === 'agent' ? t('tabAgent') : entry.mode === 'deepsearch' ? t('tabDeepsearch') : t('tabSearch')),
              h('span', { style: S.muted }, formatTime(entry.at)),
              h('span', { style: S.muted }, formatDuration(entry.ms)),
              entry.mode === 'search' ? h('span', { style: S.muted }, String(entry.count || 0)) : null,
              entry.status === 'failed' ? h(Chip, { style: { color: 'var(--dsw-alias-state-error-primary)' } }, t('failed')) : null,
              h('span', { style: S.grow }),
              (entry.mode === 'agent' && entry.status !== 'failed') || entry.reportPath
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: S.button,
                      disabled: savingId === entry.id,
                      onClick: () => saveEntry(entry),
                    },
                    savingId === entry.id ? t('savingDesktop') : t('saveDesktop'),
                  )
                : null,
              entry.mode === 'deepsearch' && entry.sessionId && entry.reportPath && entry.status !== 'failed'
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: S.button,
                      disabled: continuingId === entry.id,
                      onClick: () => continueEntry(entry),
                    },
                    continuingId === entry.id ? t('continuing') : t('continueRound'),
                  )
                : null,
            ),
            h(
              'div',
              { style: { fontWeight: 500 } },
              String(entry.query || '').split('\n').join(' · '),
            ),
            saved[entry.id] ? h('div', { style: Object.assign({}, S.muted, { marginTop: 2 }) }, saved[entry.id]) : null,
            open === entry.id
              ? h(
                  'div',
                  { style: { marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--dsw-alias-border-l1)' } },
                  entry.mode === 'agent' || entry.mode === 'deepsearch'
                    ? renderReportBody(entry)
                    : (entry.sources || []).map((source, index) =>
                        h(
                          'div',
                          { key: index, style: { marginBottom: 6 } },
                          h('a', { href: source.url, target: '_blank', rel: 'noreferrer noopener', style: S.link, onClick: (event) => { event.preventDefault(); event.stopPropagation(); openLink(source.url) } }, source.title || source.url),
                          h('div', { style: Object.assign({}, S.muted, S.mono) }, hostOf(source.url)),
                          source.snippet ? h('div', null, source.snippet) : null,
                        ),
                      ),
                  entry.error
                    ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary)' } }, `${t('errorLabel')}：${entry.error}`)
                    : null,
                )
              : null,
          ),
        ),
      )
    }

    function ConfigPage(props) {
      const { t, data, refresh } = props
      const all = (data && data.configFields) || []
      // New host fields that have no group yet stay visible here rather than
      // silently disappearing from the panel.
      const fields = all.filter((meta) => CONFIG_GROUPS.general.includes(meta.key) || !GROUPED_CONFIG_KEYS.has(meta.key))
      return h(
        'div',
        null,
        h(ConfigCard, {
          t,
          title: t('configGeneral'),
          hint: t('configGeneralHint'),
          fields,
          values: (data && data.config) || {},
          onSaved: refresh,
          data,
        }),
        h(Diagnostics, { t, data }),
      )
    }

    function Diagnostics(props) {
      const { t, data } = props
      return h(
        'details',
        { style: S.card },
        h('summary', { style: { cursor: 'pointer', fontWeight: 600 } }, t('diagTitle')),
        h('div', { style: Object.assign({}, S.muted, { marginTop: 6, marginBottom: 8 }) }, t('diagHint')),
        h(
          'div',
          { style: Object.assign({}, S.mono, S.muted, { marginBottom: 4, wordBreak: 'break-all' }) },
          `${t('dataRoot')} · ${(data && data.dataRoot) || ''}`,
        ),
        h(
          'div',
          { style: Object.assign({}, S.mono, S.muted, { marginBottom: 10, wordBreak: 'break-all' }) },
          `${t('workspace')} · ${(data && data.workspace) || ''}`,
        ),
        h(
          'div',
          { style: { marginTop: 10 } },
          h('div', { style: Object.assign({}, S.muted, { marginBottom: 4 }) }, t('attachLog')),
          ((data && data.attachLog) || []).slice(-10).map((item, index) =>
            h(
              'div',
              { key: index, style: Object.assign({}, S.mono, S.muted, { wordBreak: 'break-all' }) },
              `${formatTime(item.at)} ${item.kind} ${item.detail}`,
            ),
          ),
        ),
        h(
          'div',
          { style: { marginTop: 10 } },
          h('div', { style: Object.assign({}, S.muted, { marginBottom: 4 }) }, t('errors')),
          ((data && data.errors) || []).length === 0
            ? h('div', { style: S.muted }, t('noErrors'))
            : ((data && data.errors) || []).map((item, index) =>
                h(
                  'div',
                  { key: index, style: Object.assign({}, S.mono, S.err, { wordBreak: 'break-all' }) },
                  `${formatTime(item.at)} ${item.kind}: ${item.detail}`,
                ),
              ),
        ),
      )
    }

    // The method notes belong to deep search, so the editor lives on the deep
    // search page next to the run controls and the tool switch.
    function MethodsCard(props) {
      const { t, data, refresh } = props
      const [methods, setMethods] = useState(null)
      const [methodsBody, setMethodsBody] = useState('')
      const [methodsBusy, setMethodsBusy] = useState(false)
      const [methodsFlash, setMethodsFlash] = useState('')
      const [methodsError, setMethodsError] = useState('')
      const [bundled, setBundled] = useState(Boolean(data && data.config && data.config.methodBundled))
      const configBundled = Boolean(data && data.config && data.config.methodBundled)

      useEffect(() => setBundled(configBundled), [configBundled])

      const loadMethods = useCallback(() => {
        setMethodsError('')
        getMethods()
          .then((next) => {
            setMethods(next)
            setMethodsBody(String(next.body ?? ''))
          })
          .catch((failure) => setMethodsError(String(failure && failure.message ? failure.message : failure)))
      }, [])

      useEffect(() => {
        loadMethods()
      }, [loadMethods])

      const methodsDirty = Boolean(methods) && methodsBody !== String(methods.body ?? '')

      const toggleBundled = async (next) => {
        setBundled(next)
        try {
          await postJson('/config', { values: { methodBundled: next } })
          if (refresh) refresh()
          loadMethods()
        } catch (failure) {
          setBundled(!next)
          setMethodsError(String(failure && failure.message ? failure.message : failure))
        }
      }

      const saveMethods = async () => {
        if (!bundled) return
        setMethodsBusy(true)
        setMethodsError('')
        try {
          const result = await putMethods(methodsBody)
          const next = result.methods || {}
          setMethods(next)
          setMethodsBody(String(next.body ?? ''))
          setMethodsFlash(t('methodsSaved'))
          setTimeout(() => setMethodsFlash(''), 3000)
          if (refresh) refresh()
        } catch (failure) {
          setMethodsError(String(failure && failure.message ? failure.message : failure))
        } finally {
          setMethodsBusy(false)
        }
      }

      const cardHead = (title, flashText, switchTitle, checked, onChange) =>
        h(
          'summary',
          { style: Object.assign({}, S.cardHead, { cursor: 'pointer', listStyle: 'none' }) },
          h('div', { style: S.cardTitle }, title),
          h('div', { style: S.grow }),
          flashText ? h('span', { style: { color: 'var(--dsw-alias-brand-primary)' } }, flashText) : null,
          h(
            'span',
            { onClick: (event) => { event.preventDefault(); event.stopPropagation() } },
            h(Switch, { checked, onChange, title: switchTitle }),
          ),
        )

      return h(
        'details',
        { style: Object.assign({}, S.card, { marginTop: 12 }) },
        cardHead(t('methodsTitle'), methodsFlash, t('methodsHint'), bundled, toggleBundled),
        h(
          'div',
          { style: { marginTop: 8 } },
          bundled
            ? h(
                'div',
                { style: Object.assign({}, S.mono, S.muted, { marginBottom: 6, wordBreak: 'break-all' }) },
                methods ? methods.absolute : '',
              )
            : h('div', { style: Object.assign({}, S.muted, { marginTop: 2 }) }, t('methodsOffHint')),
          bundled
            ? h('textarea', {
                style: Object.assign({}, S.input, S.mono, { minHeight: 320, lineHeight: 1.6, marginTop: 6 }),
                value: methodsBody,
                disabled: !methods || methodsBusy,
                spellCheck: false,
                onChange: (event) => setMethodsBody(event.target.value),
              })
            : null,
          bundled
            ? h(
                'div',
                { style: Object.assign({}, S.row, { marginTop: 8, marginBottom: 0 }) },
                h(
                  'button',
                  { type: 'button', style: S.primary, disabled: methodsBusy || !methodsDirty, onClick: saveMethods },
                  methodsBusy ? `${t('methodsSave')}…` : t('methodsSave'),
                ),
                h('div', { style: S.grow }),
                h('span', { style: S.muted }, `${methodsBody.length} ${t('methodsChars')}`),
              )
            : null,
          h(ErrorLine, { text: methodsError }),
        ),
      )
    }

    function Panel(props) {
      const t = props.t
      const [tab, setTab] = useState('agent')
      const [data, setData] = useState(null)
      const [error, setError] = useState('')

      const refresh = useCallback(() => {
        getState()
          .then((next) => {
            setData(next)
            setError('')
          })
          .catch((failure) => setError(String(failure && failure.message ? failure.message : failure)))
      }, [])

      useEffect(() => {
        ensureStyle()
        refresh()
        const timer = setInterval(refresh, 20000)
        return () => clearInterval(timer)
      }, [refresh])

      // A long run keeps going on the host even when the page reloads; poll
      // faster while the host reports one, so the banner clears by itself.
      const activeRun = data && data.activeRun
      const runKey = activeRun ? `${activeRun.kind}:${activeRun.startedAt}` : ''
      useEffect(() => {
        if (!runKey) return undefined
        const timer = setInterval(refresh, 2000)
        return () => clearInterval(timer)
      }, [runKey, refresh])

      const tabs = [
        ['agent', t('tabAgent'), AgentPage],
        ['deepsearch', t('tabDeepsearch'), DeepsearchPage],
        ['history', t('tabHistory'), HistoryPage],
        ['config', t('tabConfig'), ConfigPage],
      ]
      const active = tabs.find((item) => item[0] === tab) || tabs[0]
      const Page = active[2]

      // Header + tabs + the running banner share one sticky block: the whole
      // panel scrolls a long way (history, deepsearch reports) and switching
      // tabs or refreshing must stay reachable without scrolling back up.
      return h(
        'div',
        { style: S.page },
        h(
          'div',
          { style: S.stickyTop },
          h(
            'div',
            { style: S.head },
            h('div', { style: S.h1 }, t('title')),
            h('span', { style: S.grow }),
            data ? h(Chip, null, `v${data.version}`) : null,
            h('button', { type: 'button', style: S.button, onClick: refresh }, '⟳'),
          ),
          h(
            'div',
            { style: Object.assign({}, S.tabs, { marginBottom: 4 }) },
            tabs.map((item) =>
              h(
                'button',
                {
                  key: item[0],
                  type: 'button',
                  style: Object.assign({}, S.tab, tab === item[0] ? S.tabActive : null),
                  onClick: () => { setTab(item[0]); refresh() },
                },
                item[1],
              ),
            ),
          ),
          activeRun
            ? h(
                'div',
                { style: Object.assign({}, S.muted, { marginBottom: 4 }) },
                `${t('runningBanner')} · ${activeRun.kind === 'deepsearch' ? t('tabDeepsearch') : t('tabAgent')} · ${activeRun.query}`,
              )
            : null,
        ),
        h(ErrorLine, { text: error }),
        h(Page, { t, data, refresh }),
      )
    }

    // -----------------------------------------------------------------------
    // module
    // -----------------------------------------------------------------------

    function SearchIcon(props) {
      const size = (props && props.size) || 16
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' },
        h('circle', { cx: 7, cy: 7, r: 4.4, stroke: 'currentColor', strokeWidth: 1.4 }),
        h('path', { d: 'M10.4 10.4 14 14', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
      )
    }

    function registerTab(ctx, t) {
      const sidebar = typeof ctx.get === 'function' ? ctx.get('betterSidebar') : null
      if (!sidebar || typeof sidebar.registerTab !== 'function') return null
      return sidebar.registerTab({
        id: PANEL_ID,
        title: () => t('title'),
        description: () => t('tabDesc'),
        icon: () => h(SearchIcon, { size: 16 }),
        order: 31,
        single: true,
        component: () => h(Panel, { t }),
      })
    }

    return {
      name: NS,
      inject: ['slots', 'locale'],
      __test: { blocks, inline },
      apply(ctx) {
        ensureStyle()
        ctx.effect(() => ctx.locale.register(NS, DICT), `${NS}: dictionaries`)
        const t = ctx.locale.bind(NS)

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: PANEL_ID, order: 31, label: () => t('nav'), locale: NS },
            () => h(SearchIcon, { size: 18 }),
          ),
        )

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: PANEL_ID, locale: NS, inject: () => ({ t }) }, () => h(Panel, { t })),
        )
        // better-sidebar is optional; poll until it appears, like other panels.
        ctx.effect(() => {
          let dispose = null
          let timer = null
          let stopped = false
          const attempt = () => {
            if (stopped || dispose) return
            dispose = registerTab(ctx, t)
            if (!dispose) timer = setTimeout(attempt, 800)
          }
          attempt()
          return () => {
            stopped = true
            if (timer) clearTimeout(timer)
            if (dispose) {
              try {
                if (typeof dispose === 'function') dispose()
                else if (typeof dispose.dispose === 'function') dispose.dispose()
              } catch {
                /* ignore */
              }
            }
          }
        }, `${NS}: sidebar tab`)
      },
    }
  },
})
