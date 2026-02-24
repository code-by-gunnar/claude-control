export function HelpPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Help
      </h1>
      <p className="text-sm text-slate-500 mb-8">
        How Claude Code configuration works — scopes, precedence, and common gotchas.
      </p>

      <div className="space-y-8">

        {/* Scope hierarchy */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Scope hierarchy</h2>
          <p className="text-sm text-slate-600 mb-4">
            Claude Code loads configuration from four scope levels. When the same setting
            is defined in multiple scopes, the <strong>highest-priority scope wins</strong>.
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2 font-medium text-slate-600 w-24">Priority</th>
                  <th className="px-4 py-2 font-medium text-slate-600 w-24">Scope</th>
                  <th className="px-4 py-2 font-medium text-slate-600">Location</th>
                  <th className="px-4 py-2 font-medium text-slate-600">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">1 — highest</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-green-700 font-semibold">project</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{"{project}/.claude/settings.json"}<br />{"{project}/.mcp.json"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">Committed to the repo. Shared with the team.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">2</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-purple-700 font-semibold">local</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{"{project}/.claude/settings.local.json"}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">Not committed. Personal overrides for a specific project.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">3</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700 font-semibold">user</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">~/.claude/settings.json</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">Applies to all projects on this machine.</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">4 — lowest</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600 font-semibold">managed</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">/Library/Application Support/.claude/settings.json</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">Set by enterprise admins. Cannot be overridden by users.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MCP servers */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">MCP servers</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              MCP servers can be defined in <code className="font-mono text-xs bg-slate-100 px-1 rounded">{"<project>/.mcp.json"}</code> or
              under the <code className="font-mono text-xs bg-slate-100 px-1 rounded">mcpServers</code> key
              in any <code className="font-mono text-xs bg-slate-100 px-1 rounded">settings.json</code>.
              Plugins can also contribute servers automatically.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="font-medium text-amber-800 text-xs mb-1">⚠ Scope override — only one instance runs</p>
              <p className="text-xs text-amber-700">
                If the same server name is defined at multiple scopes, only the <strong>highest-priority scope</strong> is
                used by Claude Code. The lower-priority entry is silently ignored. The MCP Servers page marks these
                as <span className="font-semibold">active</span> (green) and <span className="font-semibold">shadowed</span> (grey).
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="font-medium text-amber-800 text-xs mb-1">⚠ Running from home directory (~)</p>
              <p className="text-xs text-amber-700">
                If you run <code className="font-mono bg-amber-100 px-1 rounded">claude-ctl</code> from your
                home directory, <code className="font-mono bg-amber-100 px-1 rounded">~/.claude/settings.json</code> is
                scanned as both <em>user</em> and <em>project</em> scope. claude-ctl deduplicates this automatically,
                but avoid running from <code className="font-mono bg-amber-100 px-1 rounded">~</code> for accurate results.
              </p>
            </div>
          </div>
        </section>

        {/* Hooks */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Hooks</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Hooks are configured under the <code className="font-mono text-xs bg-slate-100 px-1 rounded">hooks</code> key
              in any <code className="font-mono text-xs bg-slate-100 px-1 rounded">settings.json</code>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="font-medium text-blue-800 text-xs mb-1">ℹ Hooks are additive — all scopes run</p>
              <p className="text-xs text-blue-700">
                Unlike settings or MCP servers, hooks <strong>do not override</strong> each other.
                If the same event is configured at both project and user scope, <strong>both run</strong> — project hooks first,
                then user hooks. This is intentional and useful for layering team + personal automation.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="font-medium text-amber-800 text-xs mb-1">⚠ Same command in multiple scopes runs twice</p>
              <p className="text-xs text-amber-700">
                Because hooks are additive, if the <em>exact same command</em> is defined for the same event in both
                project and user scope, it will execute twice. The Hooks page warns when this is detected.
                Remove the duplicate from the lower-priority scope to fix it.
              </p>
            </div>
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Settings</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Settings are merged across scopes. Individual keys from higher-priority scopes
              override the same keys from lower-priority scopes. The resolved value for each
              key is what Claude Code actually uses.
            </p>
            <p>
              To see the effective value for each setting and where it comes from, check the
              <strong> Settings</strong> page — it shows the full override chain per key.
            </p>
          </div>
        </section>

        {/* Memory / CLAUDE.md */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Memory (CLAUDE.md)</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Claude reads <code className="font-mono text-xs bg-slate-100 px-1 rounded">CLAUDE.md</code> files
              from multiple locations and concatenates them into its context. All scopes are loaded simultaneously —
              there is no override, each file adds to Claude's instructions.
            </p>
            <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Load order (all loaded)</div>
              <div className="divide-y divide-slate-100">
                {[
                  ["~/.claude/CLAUDE.md", "User-level global instructions"],
                  ["{project}/CLAUDE.md", "Project root — team instructions"],
                  ["{project}/.claude/CLAUDE.md", "Project .claude/ — additional project instructions"],
                ].map(([path, desc]) => (
                  <div key={path} className="px-4 py-2.5 flex gap-4">
                    <code className="font-mono text-slate-700 w-64 shrink-0">{path}</code>
                    <span className="text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Plugins */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Plugins</h2>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Plugins are enabled via <code className="font-mono text-xs bg-slate-100 px-1 rounded">enabledPlugins</code> in
              a <code className="font-mono text-xs bg-slate-100 px-1 rounded">settings.json</code>. They can contribute
              MCP servers, skills, and commands automatically — no manual configuration required.
            </p>
            <p>
              Plugins are installed to <code className="font-mono text-xs bg-slate-100 px-1 rounded">~/.claude/plugins/cache/</code> and
              their MCP servers are tagged with a <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">plugin</span> badge
              on the MCP Servers page.
            </p>
          </div>
        </section>

        {/* Common gotchas */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Common gotchas</h2>
          <div className="space-y-2">
            {[
              {
                title: "Running claude-ctl from ~",
                body: "The home directory is treated as a project root, causing ~/.claude/settings.json to be read twice under different scopes. Run from an actual project directory for accurate scope attribution.",
              },
              {
                title: "MCP server defined in both settings.json and .mcp.json",
                body: "If the same server name appears in both files at the same scope, only one definition is used. Prefer .mcp.json for project-level servers and settings.json for user-level servers to keep them separate.",
              },
              {
                title: "Hook runs unexpectedly twice",
                body: "A hook command defined for the same event in both project and user settings will run twice per invocation. Check the Hooks page for same-command duplicate warnings.",
              },
              {
                title: "Plugin MCP server not appearing",
                body: "The plugin must be both installed and enabled (enabledPlugins key set to true). Check the Plugins page to verify status. Also ensure the plugin has a .mcp.json file.",
              },
              {
                title: "Project settings not taking effect",
                body: "Claude Code only loads project-scope settings when run from inside the project directory. If you open Claude Code from a different directory, project settings won't apply.",
              },
            ].map((item) => (
              <div key={item.title} className="border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-slate-800 mb-1">{item.title}</p>
                <p className="text-xs text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Useful commands */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Useful CLI commands</h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <div className="divide-y divide-slate-100">
              {[
                ["claude-ctl mcp", "List all MCP servers with scope and source path"],
                ["claude-ctl hooks", "Show configured hooks per event"],
                ["claude-ctl settings", "Show resolved settings with override chain"],
                ["claude-ctl health", "Configuration health score and recommendations"],
                ["claude-ctl scan-skills", "Security scan all skills and commands"],
                ["claude-ctl dashboard", "Launch this web dashboard"],
              ].map(([cmd, desc]) => (
                <div key={cmd} className="px-4 py-2.5 flex gap-4">
                  <code className="font-mono text-slate-800 w-52 shrink-0">{cmd}</code>
                  <span className="text-slate-500">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
