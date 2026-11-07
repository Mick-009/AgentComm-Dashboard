import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Folder,
  Files,
  Puzzle,
  Hash,
  Plus,
  Send,
  Pin,
  X,
  Menu,
  Trash2,
  Download,
  Upload,
  Zap,
  Copy,
  Check,
} from "lucide-react";
import {
  AGENT_COLORS,
  PLUGINS,
  ROLE_PRESETS,
  channelKey,
  pairKey,
  threadOf,
  useWorkspace,
  type Agent,
  type RoleName,
} from "@/lib/workspace-store";
import { renderMarkdown } from "@/lib/markdown";

type Panel = "project" | "files" | "plugins" | null;
type Dialog =
  | { kind: "room" }
  | { kind: "dm" }
  | { kind: "agent"; id?: string }
  | null;

const ROLES = Object.keys(ROLE_PRESETS) as RoleName[];

export function Workspace() {
  const store = useWorkspace();
  const [nav, setNav] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [draft, setDraft] = useState("");
  const [speaker, setSpeaker] = useState("human");
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const thread = threadOf(store);
  const key = channelKey(store.current);
  const pinId = store.pinned[key];
  const project = store.projects.find((p) => p.id === thread.meta.projectId) ?? null;
  const attachedFiles = store.files.filter((f) => thread.meta.fileIds.includes(f.id));
  const activePlugins = PLUGINS.filter((p) => thread.meta.pluginIds.includes(p.id));

  const title = useMemo(() => {
    if (store.current.type === "room") {
      const room = store.rooms.find((r) => r.id === store.current.id);
      return { head: room ? `# ${room.name}` : "Room", sub: room?.description ?? "" };
    }
    const agents = pairAgents(store.agents, store.current.id);
    return {
      head: agents.length === 2 ? `${agents[0]!.name} ↔ ${agents[1]!.name}` : "Direct message",
      sub: agents.length === 2 ? `${agents[0]!.role} × ${agents[1]!.role}` : "",
    };
  }, [store.agents, store.current, store.rooms]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length, store.current.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function flash(msg: string) {
    setToast(msg);
  }

  function toggle(next: Panel) {
    setPanel((cur) => (cur === next ? null : next));
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    for (const file of Array.from(list)) {
      const textish = file.type.startsWith("text/") || /\.(md|txt|json|csv|ts|tsx|js|py|html|css)$/i.test(file.name);
      let excerpt = "";
      if (textish && file.size < 80_000) {
        excerpt = (await file.text()).slice(0, 4000);
      }
      store.addFile({
        name: file.name,
        kind: textish ? "text" : "other",
        excerpt,
        size: file.size,
      });
    }
    flash(list.length === 1 ? "File attached" : `${list.length} files attached`);
    setPanel("files");
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    store.send(speaker, draft);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 bg-bg text-ink">
      {nav && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setNav(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-line bg-panel md:static md:translate-x-0 ${nav ? "translate-x-0" : "-translate-x-full"} transition-transform`}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">AC</div>
          <div>
            <p className="text-sm font-semibold leading-tight">AgentComm</p>
            <p className="text-xs text-muted">Workflow workspace</p>
          </div>
        </div>

        <Section label="Direct messages" onAdd={() => setDialog({ kind: "dm" })}>
          {Object.keys(store.dms).length === 0 && (
            <p className="px-2 text-xs text-faint">No private threads yet.</p>
          )}
          {Object.keys(store.dms).map((pair) => {
            const agents = pairAgents(store.agents, pair);
            if (agents.length < 2) return null;
            const active = store.current.type === "dm" && store.current.id === pair;
            return (
              <div key={pair} className={`group flex items-center rounded-md ${active ? "bg-hover" : "hover:bg-hover"}`}>
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm"
                  onClick={() => { store.openDm(pair); setNav(false); }}
                >
                  <Dot color={agents[0]!.color} />
                  <Dot color={agents[1]!.color} />
                  <span className="truncate text-xs">{agents[0]!.name} ↔ {agents[1]!.name}</span>
                </button>
                <button
                  aria-label="Delete DM"
                  className="px-2 text-faint opacity-0 hover:text-danger group-hover:opacity-100"
                  onClick={() => {
                    if (confirm(`Delete ${agents[0]!.name} ↔ ${agents[1]!.name}?`)) store.deleteDm(pair);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </Section>

        <Section label="Rooms" onAdd={() => setDialog({ kind: "room" })}>
          {store.rooms.map((room) => {
            const active = store.current.type === "room" && store.current.id === room.id;
            return (
              <button
                key={room.id}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${active ? "bg-hover text-ink" : "text-muted hover:bg-hover"}`}
                onClick={() => { store.openRoom(room.id); setNav(false); }}
              >
                <Hash className="h-3.5 w-3.5 text-faint" />
                <span className="truncate">{room.name}</span>
              </button>
            );
          })}
        </Section>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Agents</span>
            <button aria-label="Add agent" className="text-muted hover:text-ink" onClick={() => setDialog({ kind: "agent" })}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            {store.agents.map((agent) => (
              <button
                key={agent.id}
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-hover"
                onClick={() => setDialog({ kind: "agent", id: agent.id })}
              >
                <Avatar agent={agent} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{agent.name}</span>
                  <span className="block text-xs text-accent">{agent.role}</span>
                  <span className="block text-[11px] text-faint">{agent.connected ? "Connected" : "Not connected"}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 border-t border-line p-3">
          <SideAction icon={Download} label="Export data" onClick={() => download(store.exportJson())} />
          <a
            href="/agentcomm-source.zip"
            download="agentcomm-source.zip"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-accent hover:bg-hover"
          >
            <Download className="h-3.5 w-3.5" /> Download source zip
          </a>
          <a
            href="/agentcomm-manual.pdf"
            download="agentcomm-manual.pdf"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-ink hover:bg-hover"
          >
            <Download className="h-3.5 w-3.5" /> User manual (PDF)
          </a>
          <SideAction
            icon={Upload}
            label="Import"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return;
                file.text().then((raw) => flash(store.importJson(raw) ? "Imported" : "That file is not a workspace export"));
              };
              input.click();
            }}
          />
          <button
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-danger hover:bg-hover"
            onClick={() => { if (confirm("Restore the default workspace?")) store.reset(); }}
          >
            Reset defaults
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line px-3 md:px-5">
          <button className="grid h-10 w-10 place-items-center rounded-md hover:bg-hover md:hidden" aria-label="Open menu" onClick={() => setNav(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">{title.head}</h1>
            <p className="truncate text-xs text-muted">{title.sub}</p>
          </div>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-raised px-3 text-xs font-medium text-ink hover:bg-hover"
            onClick={() => {
              if (!thread.messages.length) return flash("Nothing to clear");
              if (confirm("Clear messages in this conversation?")) store.clearThread();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent/15 px-3 text-xs font-medium text-accent hover:bg-accent/25"
            onClick={() => store.simulate()}
          >
            <Zap className="h-3.5 w-3.5" />
            Simulate
          </button>
        </header>

        {pinId && (
          <div className="flex items-start gap-2 border-b border-line bg-raised/60 px-4 py-2 text-xs">
            <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <p className="min-w-0 flex-1 truncate text-muted">
              {thread.messages.find((m) => m.id === pinId)?.text ?? "Pinned"}
            </p>
            <button className="text-faint hover:text-ink" onClick={() => store.togglePin(pinId)}>Unpin</button>
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6">
          {thread.messages.length === 0 && (
            <p className="pt-16 text-center text-sm text-muted">No messages yet. Attach a project, files, or plugins, then send.</p>
          )}
          {thread.messages.map((m) => {
            const agent = store.agents.find((a) => a.id === m.agentId);
            return (
              <article key={m.id} className="group flex gap-3">
                {agent ? <Avatar agent={agent} /> : <div className="h-9 w-9 rounded-full bg-raised" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium" style={{ color: agent?.color }}>{agent?.name ?? "Unknown"}</span>
                    <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] text-muted">{agent?.role}</span>
                    <time className="text-[11px] text-faint">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  <div className="md mt-1 text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }} />
                </div>
                <button
                  aria-label="Pin message"
                  className="h-8 w-8 shrink-0 rounded-md text-faint opacity-0 hover:bg-hover hover:text-accent group-hover:opacity-100"
                  onClick={() => store.togglePin(m.id)}
                >
                  <Pin className={`mx-auto h-3.5 w-3.5 ${pinId === m.id ? "fill-accent text-accent" : ""}`} />
                </button>
              </article>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line bg-panel/80 p-3 md:p-4">
          {(project || attachedFiles.length > 0 || activePlugins.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {project && (
                <Chip onRemove={() => store.setProject(null)}>
                  <Folder className="h-3 w-3" /> {project.name}
                </Chip>
              )}
              {attachedFiles.map((f) => (
                <Chip key={f.id} onRemove={() => store.removeFileFromChannel(f.id)}>
                  <Files className="h-3 w-3" /> {f.name}
                </Chip>
              ))}
              {activePlugins.map((p) => (
                <Chip key={p.id} onRemove={() => store.togglePlugin(p.id)}>
                  <Puzzle className="h-3 w-3" /> {p.name}
                </Chip>
              ))}
            </div>
          )}

          <div className="relative rounded-xl border border-line bg-raised">
            {panel && (
              <div className="absolute bottom-full left-3 z-10 mb-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-line bg-panel p-3 shadow-2xl">
                {panel === "project" && (
                  <ProjectPanel
                    projects={store.projects}
                    activeId={thread.meta.projectId}
                    onPick={(id) => { store.setProject(id); setPanel(null); }}
                    onCreate={(name, brief) => { store.ensureProject(name, brief); setPanel(null); flash("Project attached"); }}
                  />
                )}
                {panel === "files" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">Files stay with this conversation. Text files keep a short excerpt the agents can refer to.</p>
                    <button className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-ink" onClick={() => fileRef.current?.click()}>
                      Add files
                    </button>
                    {attachedFiles.length === 0 && <p className="text-xs text-faint">Nothing attached yet.</p>}
                    {attachedFiles.map((f) => (
                      <div key={f.id} className="rounded-md bg-raised px-2 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">{f.name}</span>
                          <button className="text-faint hover:text-danger" onClick={() => store.removeFileFromChannel(f.id)}>Remove</button>
                        </div>
                        {f.excerpt && <p className="mt-1 line-clamp-3 text-muted">{f.excerpt}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {panel === "plugins" && (
                  <div className="space-y-1">
                    <p className="mb-2 text-xs text-muted">Turn tools on for this room or DM. Simulated replies will mention them.</p>
                    {PLUGINS.map((p) => {
                      const on = thread.meta.pluginIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left ${on ? "bg-accent/15" : "hover:bg-hover"}`}
                          onClick={() => store.togglePlugin(p.id)}
                        >
                          <span className={`mt-0.5 grid h-4 w-4 place-items-center rounded border ${on ? "border-accent bg-accent text-accent-ink" : "border-line"}`}>
                            {on && <Check className="h-3 w-3" />}
                          </span>
                          <span>
                            <span className="block text-sm">{p.name}</span>
                            <span className="block text-xs text-muted">{p.blurb}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 px-3 pt-2 text-[11px] text-muted">
              Speaking as
              <select
                className="rounded-md border border-line bg-bg px-2 py-1 text-xs text-ink"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
              >
                {store.agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </label>
            <textarea
              rows={2}
              value={draft}
              placeholder="Message this workspace…"
              className="w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-faint"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="flex items-center gap-1 border-t border-line/80 px-2 py-1.5">
              <ToolButton icon={Folder} label="Project" active={!!project || panel === "project"} onClick={() => toggle("project")} />
              <ToolButton icon={Files} label="Files" active={attachedFiles.length > 0 || panel === "files"} onClick={() => toggle("files")} />
              <ToolButton icon={Puzzle} label="Plugins" active={activePlugins.length > 0 || panel === "plugins"} onClick={() => toggle("plugins")} />
              <span className="ml-auto hidden text-[11px] text-faint sm:inline">Markdown supported</span>
              <button
                className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink sm:ml-2"
                aria-label="Send"
                onClick={submit}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        </div>
      </main>

      {dialog && (
        <DialogShell title={dialogTitle(dialog, store.agents)} onClose={() => setDialog(null)}>
          {dialog.kind === "room" && (
            <RoomForm onSave={(name, description) => { store.addRoom(name, description); setDialog(null); }} />
          )}
          {dialog.kind === "dm" && (
            <DmForm
              agents={store.agents.filter((a) => a.id !== "human")}
              onSave={(a, b) => {
                if (a === b) return flash("Pick two different agents");
                store.openDm(pairKey(a, b));
                setDialog(null);
                setNav(false);
              }}
            />
          )}
          {dialog.kind === "agent" && (
            <AgentForm
              agent={dialog.id ? store.agents.find((a) => a.id === dialog.id) : undefined}
              onSave={(values, id) => {
                if (id) store.updateAgent(id, values);
                else store.addAgent(values);
                setDialog(null);
              }}
              onDelete={dialog.id && dialog.id !== "human" ? () => { store.removeAgent(dialog.id!); setDialog(null); } : undefined}
              onCopy={(text) => {
                void navigator.clipboard.writeText(text).then(() => flash("System prompt copied")).catch(() => flash("Could not copy"));
              }}
            />
          )}
        </DialogShell>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-ink px-3 py-2 text-sm text-bg">{toast}</div>
      )}
    </div>
  );
}

function pairAgents(agents: Agent[], pair: string) {
  return pair.split("_").map((id) => agents.find((a) => a.id === id)).filter((a): a is Agent => !!a);
}

function dialogTitle(dialog: Exclude<Dialog, null>, agents: Agent[]) {
  if (dialog.kind === "room") return "New room";
  if (dialog.kind === "dm") return "New agent DM";
  if (dialog.id) return `Edit ${agents.find((a) => a.id === dialog.id)?.name ?? "agent"}`;
  return "Add agent";
}

function Section({ label, onAdd, children }: { label: string; onAdd: () => void; children: ReactNode }) {
  return (
    <div className="px-3 pt-4">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{label}</span>
        <button aria-label={`Add ${label}`} className="text-muted hover:text-ink" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-36 space-y-0.5 overflow-y-auto">{children}</div>
    </div>
  );
}

function SideAction({ icon: Icon, label, onClick }: { icon: typeof Download; label: string; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted hover:bg-hover" onClick={onClick}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function Avatar({ agent }: { agent: Agent }) {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-accent-ink" style={{ background: agent.color }}>
      {agent.name.slice(0, 2).toUpperCase()}
      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-bg ${agent.status === "online" ? "bg-emerald-400" : agent.status === "away" ? "bg-amber-400" : "bg-faint"}`} />
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="h-3.5 w-3.5 rounded-full ring-2 ring-panel" style={{ background: color }} />;
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-raised px-2 py-1 text-xs text-ink">
      <span className="flex min-w-0 items-center gap-1 truncate">{children}</span>
      <button aria-label="Remove" className="text-faint hover:text-ink" onClick={onRemove}><X className="h-3 w-3" /></button>
    </span>
  );
}

function ToolButton({ icon: Icon, label, active, onClick }: { icon: typeof Folder; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm ${active ? "bg-accent/15 text-accent" : "text-muted hover:bg-hover hover:text-ink"}`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ProjectPanel({
  projects, activeId, onPick, onCreate,
}: {
  projects: { id: string; name: string; brief: string }[];
  activeId: string | null;
  onPick: (id: string | null) => void;
  onCreate: (name: string, brief: string) => void;
}) {
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">A project is the job this conversation is working on.</p>
      {projects.map((p) => (
        <button
          key={p.id}
          className={`block w-full rounded-md px-2 py-2 text-left ${activeId === p.id ? "bg-accent/15" : "hover:bg-hover"}`}
          onClick={() => onPick(activeId === p.id ? null : p.id)}
        >
          <span className="block text-sm">{p.name}</span>
          <span className="block text-xs text-muted">{p.brief}</span>
        </button>
      ))}
      <div className="space-y-2 border-t border-line pt-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project name" className="w-full rounded-md border border-line bg-bg px-2 py-2 text-sm" />
        <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What is it for?" className="w-full rounded-md border border-line bg-bg px-2 py-2 text-sm" />
        <button
          className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-ink disabled:opacity-40"
          disabled={!name.trim()}
          onClick={() => onCreate(name, brief)}
        >
          Create and attach
        </button>
      </div>
    </div>
  );
}

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button aria-label="Close" onClick={onClose}><X className="h-4 w-4 text-muted" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block text-xs text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink";

function RoomForm({ onSave }: { onSave: (name: string, description: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name, description); }}>
      <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Description"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      <Save />
    </form>
  );
}

function DmForm({ agents, onSave }: { agents: Agent[]; onSave: (a: string, b: string) => void }) {
  const [a, setA] = useState(agents[0]?.id ?? "");
  const [b, setB] = useState(agents[1]?.id ?? agents[0]?.id ?? "");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(a, b); }}>
      <Field label="First agent">
        <select className={inputCls} value={a} onChange={(e) => setA(e.target.value)}>
          {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
        </select>
      </Field>
      <Field label="Second agent">
        <select className={inputCls} value={b} onChange={(e) => setB(e.target.value)}>
          {agents.map((ag) => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
        </select>
      </Field>
      <Save />
    </form>
  );
}

function AgentForm({
  agent, onSave, onDelete, onCopy,
}: {
  agent?: Agent;
  onSave: (values: Omit<Agent, "id" | "status">, id?: string) => void;
  onDelete?: () => void;
  onCopy: (text: string) => void;
}) {
  const [name, setName] = useState(agent?.name ?? "");
  const [color, setColor] = useState(agent?.color ?? AGENT_COLORS[0]!);
  const [role, setRole] = useState<RoleName>(agent?.role ?? "Custom");
  const [roleDesc, setRoleDesc] = useState(agent?.roleDesc ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.systemPrompt ?? "");
  const [connected, setConnected] = useState(agent?.connected ?? false);
  const [connectionNotes, setConnectionNotes] = useState(agent?.connectionNotes ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), color, role, roleDesc, systemPrompt, connected, connectionNotes }, agent?.id);
      }}
    >
      <Field label="Name"><input className={inputCls} value={name} readOnly={agent?.id === "human"} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Color">
        <div className="flex flex-wrap gap-2">
          {AGENT_COLORS.map((c) => (
            <button key={c} type="button" aria-label={c} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-panel" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </Field>
      <Field label="Role">
        <select
          className={inputCls}
          value={role}
          onChange={(e) => {
            const next = e.target.value as RoleName;
            setRole(next);
            if (next !== "Custom") setRoleDesc(ROLE_PRESETS[next]);
          }}
        >
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Role instructions"><textarea className={inputCls} rows={2} value={roleDesc} onChange={(e) => setRoleDesc(e.target.value)} /></Field>
      <Field label="System prompt">
        <textarea className={`${inputCls} font-mono text-xs`} rows={3} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        {systemPrompt && (
          <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs text-accent" onClick={() => onCopy(systemPrompt)}>
            <Copy className="h-3 w-3" /> Copy
          </button>
        )}
      </Field>
      <label className="mb-3 flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={connected} onChange={(e) => setConnected(e.target.checked)} />
        Mark as connected
      </label>
      <Field label="Connection notes"><textarea className={inputCls} rows={2} value={connectionNotes} onChange={(e) => setConnectionNotes(e.target.value)} /></Field>
      <div className="flex items-center justify-between">
        {onDelete ? <button type="button" className="text-xs text-danger" onClick={onDelete}>Delete agent</button> : <span />}
        <Save />
      </div>
    </form>
  );
}

function Save() {
  return <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">Save</button>;
}

function download(json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "agentcomm.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
