import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RoleName =
  | "Ideator"
  | "Researcher"
  | "Planner"
  | "Engineer"
  | "Reviewer"
  | "Copywriter"
  | "Critic"
  | "Synthesizer"
  | "Strategist"
  | "Debugger"
  | "Product Manager"
  | "Designer"
  | "Analyst"
  | "Facilitator"
  | "Custom";

export type Agent = {
  id: string;
  name: string;
  color: string;
  status: "online" | "away" | "offline";
  role: RoleName;
  roleDesc: string;
  systemPrompt: string;
  connected: boolean;
  connectionNotes: string;
};

export type Room = { id: string; name: string; description: string };

export type Message = {
  id: string;
  agentId: string;
  text: string;
  ts: number;
};

export type Project = { id: string; name: string; brief: string };

export type WorkFile = {
  id: string;
  name: string;
  kind: "text" | "other";
  excerpt: string;
  size: number;
};

export type ChannelMeta = {
  projectId: string | null;
  fileIds: string[];
  pluginIds: string[];
};

export const ROLE_PRESETS: Record<RoleName, string> = {
  Ideator: "Generate many ideas, explore possibilities, think laterally, avoid early judgment.",
  Researcher: "Gather facts, find sources, summarize evidence, highlight unknowns and confidence levels.",
  Planner: "Break work into steps, sequence tasks, identify dependencies and risks, produce clear plans.",
  Engineer: "Focus on implementation, architecture, trade-offs, edge cases, and concrete build steps.",
  Reviewer: "Critique constructively, find gaps, test assumptions, suggest improvements, stay rigorous.",
  Copywriter: "Write clear, persuasive, or elegant prose. Focus on tone, clarity, and audience.",
  Critic: "Play devil's advocate. Challenge ideas, surface weaknesses, force stronger reasoning.",
  Synthesizer: "Combine inputs from others into coherent summaries, decisions, or next actions.",
  Strategist: "Focus on high-level direction, positioning, long-term trade-offs, and choosing between big options.",
  Debugger: "Systematically hunt for bugs, failure modes, root causes, and reproducible steps.",
  "Product Manager": "Prioritize work, define scope, write user stories and acceptance criteria, protect the roadmap.",
  Designer: "Think about UX, information architecture, visual hierarchy, and user mental models.",
  Analyst: "Work with numbers, metrics, comparisons, and data interpretation. Be precise.",
  Facilitator: "Keep discussions on track, surface decisions, manage turn-taking, and clarify next steps.",
  Custom: "",
};

const REPLIES: Partial<Record<RoleName, string[]>> = {
  Ideator: ["Here's a different angle we haven't tried yet.", "Three wild ideas, then we can filter."],
  Researcher: ["Source quality varies here. Flagging confidence.", "There's a gap in the data we should resolve first."],
  Planner: ["Breaking this into sequenced steps.", "Risks and mitigations for the next phase:"],
  Engineer: ["The cleanest implementation path looks like this.", "Trade-off: speed versus maintainability."],
  Reviewer: ["Strengths first, then the gaps.", "I'd want evidence before we lock this in."],
  Copywriter: ["Here's a tighter version of that message.", "Lead with the benefit."],
  Critic: ["Devil's advocate: the biggest hole is this.", "We're optimizing for the wrong metric."],
  Synthesizer: ["Pulling the threads into one view.", "Recommended decision and next actions:"],
  Strategist: ["The strategic choice is which path we lock in.", "Two directions, very different risk."],
  Debugger: ["Most likely root cause from the symptoms.", "Let's isolate one variable and retest."],
  "Product Manager": ["User story plus acceptance criteria.", "This is scope, not a side quest."],
  Designer: ["The friction is in the first screen.", "Hierarchy needs a clearer primary action."],
  Analyst: ["The numbers that actually matter are these.", "What the data does not tell us yet:"],
  Facilitator: ["Decision needed before we continue.", "Who owns the next action?"],
};

export const PLUGINS = [
  { id: "search", name: "Web search", blurb: "Look things up before answering." },
  { id: "code", name: "Code", blurb: "Draft, review, and reason about code." },
  { id: "canvas", name: "Canvas", blurb: "Work in a shared doc or plan." },
  { id: "image", name: "Image", blurb: "Sketch visuals and UI ideas." },
  { id: "memory", name: "Memory", blurb: "Keep decisions from this project." },
] as const;

export const AGENT_COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#f472b6", "#38bdf8", "#facc15", "#fb923c", "#4ade80"];

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("_");
}

export function channelKey(current: { type: "room" | "dm"; id: string }) {
  return current.type === "room" ? `room:${current.id}` : `dm:${current.id}`;
}

function uid(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function seedAgents(): Agent[] {
  return [
    { id: "a1", name: "Grok", color: "#22d3ee", status: "online", role: "Ideator", roleDesc: ROLE_PRESETS.Ideator, systemPrompt: "You are Grok, an Ideator. Generate many ideas and avoid early judgment.", connected: false, connectionNotes: "xAI session" },
    { id: "a2", name: "Claude", color: "#a78bfa", status: "online", role: "Reviewer", roleDesc: ROLE_PRESETS.Reviewer, systemPrompt: "You are Claude, a careful Reviewer. Find gaps and stay rigorous.", connected: false, connectionNotes: "claude.ai" },
    { id: "a3", name: "ChatGPT", color: "#34d399", status: "online", role: "Planner", roleDesc: ROLE_PRESETS.Planner, systemPrompt: "You are ChatGPT acting as a Planner. Sequence work and name risks.", connected: false, connectionNotes: "chatgpt.com" },
    { id: "a4", name: "Gemini", color: "#f472b6", status: "online", role: "Researcher", roleDesc: ROLE_PRESETS.Researcher, systemPrompt: "You are Gemini, a Researcher. Summarize evidence and unknowns.", connected: false, connectionNotes: "gemini.google.com" },
    { id: "a5", name: "Copilot", color: "#38bdf8", status: "away", role: "Engineer", roleDesc: ROLE_PRESETS.Engineer, systemPrompt: "You are Copilot acting as an Engineer. Focus on build steps.", connected: false, connectionNotes: "Microsoft Copilot" },
    { id: "human", name: "You", color: "#facc15", status: "online", role: "Synthesizer", roleDesc: ROLE_PRESETS.Synthesizer, systemPrompt: "", connected: true, connectionNotes: "Orchestrator" },
  ];
}

type Thread = { messages: Message[]; meta: ChannelMeta };

type State = {
  agents: Agent[];
  rooms: Room[];
  dms: Record<string, Thread>;
  roomsData: Record<string, Thread>;
  projects: Project[];
  files: WorkFile[];
  pinned: Record<string, string>;
  current: { type: "room" | "dm"; id: string };
  addRoom: (name: string, description: string) => void;
  addAgent: (partial: Omit<Agent, "id" | "status">) => void;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  openRoom: (id: string) => void;
  openDm: (pair: string) => void;
  deleteDm: (pair: string) => void;
  send: (agentId: string, text: string) => void;
  simulate: () => void;
  clearThread: () => void;
  togglePin: (messageId: string) => void;
  ensureProject: (name: string, brief: string) => string;
  setProject: (projectId: string | null) => void;
  addFile: (file: Omit<WorkFile, "id">) => void;
  removeFileFromChannel: (fileId: string) => void;
  togglePlugin: (pluginId: string) => void;
  exportJson: () => string;
  importJson: (raw: string) => boolean;
  reset: () => void;
};

function emptyMeta(): ChannelMeta {
  return { projectId: null, fileIds: [], pluginIds: [] };
}

function thread(messages: Message[] = []): Thread {
  return { messages, meta: emptyMeta() };
}

const initialRooms: Room[] = [
  { id: "r1", name: "general", description: "Main shared board" },
  { id: "r2", name: "coding", description: "Build and engineering" },
  { id: "r3", name: "research", description: "Sources and open questions" },
];

function initialRoomsData(): Record<string, Thread> {
  return {
    r1: thread([
      { id: "m1", agentId: "a1", text: "Board is live. Attach a **project**, **files**, and **plugins** under the composer so this thread has a real workflow.", ts: Date.now() - 3600000 },
      { id: "m2", agentId: "human", text: "Click **Project**, **Files**, or **Plugins** under the message box. Those stick to the room or DM you are in.", ts: Date.now() - 3500000 },
    ]),
    r2: thread(),
    r3: thread(),
  };
}

function currentThread(s: Pick<State, "current" | "roomsData" | "dms">): Thread {
  if (s.current.type === "room") return s.roomsData[s.current.id] ?? thread();
  return s.dms[s.current.id] ?? thread();
}

function writeThread(s: State, next: Thread): Partial<State> {
  if (s.current.type === "room") {
    return { roomsData: { ...s.roomsData, [s.current.id]: next } };
  }
  return { dms: { ...s.dms, [s.current.id]: next } };
}

export const useWorkspace = create<State>()(
  persist(
    (set, get) => ({
      agents: seedAgents(),
      rooms: initialRooms,
      dms: {},
      roomsData: initialRoomsData(),
      projects: [
        { id: "p1", name: "Launch planner", brief: "Sequence a product launch across research, copy, and engineering." },
      ],
      files: [],
      pinned: {},
      current: { type: "room", id: "r1" },

      addRoom: (name, description) => {
        const id = uid("r");
        const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || "room";
        set((s) => ({
          rooms: [...s.rooms, { id, name: slug, description }],
          roomsData: { ...s.roomsData, [id]: thread() },
          current: { type: "room", id },
        }));
      },

      addAgent: (partial) => {
        set((s) => ({
          agents: [...s.agents, { ...partial, id: uid("a"), status: "online" }],
        }));
      },

      updateAgent: (id, patch) => {
        set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
      },

      removeAgent: (id) => {
        if (id === "human") return;
        set((s) => {
          const dms = { ...s.dms };
          for (const key of Object.keys(dms)) {
            if (key.split("_").includes(id)) delete dms[key];
          }
          let current = s.current;
          if (current.type === "dm" && current.id.split("_").includes(id)) {
            current = { type: "room", id: s.rooms[0]?.id ?? "r1" };
          }
          return { agents: s.agents.filter((a) => a.id !== id), dms, current };
        });
      },

      openRoom: (id) => set({ current: { type: "room", id } }),

      openDm: (pair) => {
        set((s) => ({
          dms: s.dms[pair] ? s.dms : { ...s.dms, [pair]: thread() },
          current: { type: "dm", id: pair },
        }));
      },

      deleteDm: (pair) => {
        set((s) => {
          const dms = { ...s.dms };
          delete dms[pair];
          const pinned = { ...s.pinned };
          delete pinned[`dm:${pair}`];
          const current = s.current.type === "dm" && s.current.id === pair
            ? { type: "room" as const, id: s.rooms[0]?.id ?? "r1" }
            : s.current;
          return { dms, pinned, current };
        });
      },

      send: (agentId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const msg: Message = { id: uid("m"), agentId, text: trimmed, ts: Date.now() };
        set((s) => {
          const t = currentThread(s);
          return writeThread(s, { ...t, messages: [...t.messages, msg] });
        });
      },

      simulate: () => {
        const s = get();
        let pool = s.agents.filter((a) => a.id !== "human");
        if (s.current.type === "dm") {
          const ids = s.current.id.split("_");
          const pair = pool.filter((a) => ids.includes(a.id));
          if (pair.length) pool = pair;
        }
        if (!pool.length) return;
        const agent = pool[Math.floor(Math.random() * pool.length)]!;
        const lines = REPLIES[agent.role] ?? REPLIES.Ideator!;
        const base = lines[Math.floor(Math.random() * lines.length)]!;
        const t = currentThread(s);
        const project = s.projects.find((p) => p.id === t.meta.projectId);
        const plugins = PLUGINS.filter((p) => t.meta.pluginIds.includes(p.id)).map((p) => p.name);
        const files = s.files.filter((f) => t.meta.fileIds.includes(f.id)).map((f) => f.name);
        const bits = [
          project ? `Project: ${project.name}.` : "",
          files.length ? `Files in play: ${files.join(", ")}.` : "",
          plugins.length ? `Plugins on: ${plugins.join(", ")}.` : "",
        ].filter(Boolean);
        const text = bits.length ? `${base}\n\n${bits.join(" ")}` : base;
        get().send(agent.id, text);
      },

      clearThread: () => {
        set((s) => {
          const key = channelKey(s.current);
          const pinned = { ...s.pinned };
          delete pinned[key];
          return { ...writeThread(s, { ...currentThread(s), messages: [] }), pinned };
        });
      },

      togglePin: (messageId) => {
        set((s) => {
          const key = channelKey(s.current);
          const pinned = { ...s.pinned };
          if (pinned[key] === messageId) delete pinned[key];
          else pinned[key] = messageId;
          return { pinned };
        });
      },

      ensureProject: (name, brief) => {
        const id = uid("p");
        set((s) => {
          const projects = [...s.projects, { id, name: name.trim(), brief: brief.trim() }];
          const t = currentThread(s);
          return { projects, ...writeThread(s, { ...t, meta: { ...t.meta, projectId: id } }) };
        });
        return id;
      },

      setProject: (projectId) => {
        set((s) => {
          const t = currentThread(s);
          return writeThread(s, { ...t, meta: { ...t.meta, projectId } });
        });
      },

      addFile: (file) => {
        const id = uid("f");
        set((s) => {
          const files = [...s.files, { ...file, id }];
          const t = currentThread(s);
          const fileIds = t.meta.fileIds.includes(id) ? t.meta.fileIds : [...t.meta.fileIds, id];
          return { files, ...writeThread(s, { ...t, meta: { ...t.meta, fileIds } }) };
        });
      },

      removeFileFromChannel: (fileId) => {
        set((s) => {
          const t = currentThread(s);
          return writeThread(s, { ...t, meta: { ...t.meta, fileIds: t.meta.fileIds.filter((id) => id !== fileId) } });
        });
      },

      togglePlugin: (pluginId) => {
        set((s) => {
          const t = currentThread(s);
          const on = t.meta.pluginIds.includes(pluginId);
          const pluginIds = on ? t.meta.pluginIds.filter((id) => id !== pluginId) : [...t.meta.pluginIds, pluginId];
          return writeThread(s, { ...t, meta: { ...t.meta, pluginIds } });
        });
      },

      exportJson: () => {
        const s = get();
        return JSON.stringify({
          agents: s.agents, rooms: s.rooms, dms: s.dms, roomsData: s.roomsData,
          projects: s.projects, files: s.files, pinned: s.pinned, current: s.current,
        }, null, 2);
      },

      importJson: (raw) => {
        try {
          const data = JSON.parse(raw) as Partial<State>;
          if (!Array.isArray(data.agents) || !Array.isArray(data.rooms)) return false;
          set({
            agents: data.agents,
            rooms: data.rooms,
            dms: data.dms ?? {},
            roomsData: data.roomsData ?? {},
            projects: data.projects ?? [],
            files: data.files ?? [],
            pinned: data.pinned ?? {},
            current: data.current?.id ? data.current : { type: "room", id: data.rooms[0]?.id ?? "r1" },
          });
          return true;
        } catch {
          return false;
        }
      },

      reset: () => {
        set({
          agents: seedAgents(),
          rooms: initialRooms,
          dms: {},
          roomsData: initialRoomsData(),
          projects: [{ id: "p1", name: "Launch planner", brief: "Sequence a product launch across research, copy, and engineering." }],
          files: [],
          pinned: {},
          current: { type: "room", id: "r1" },
        });
      },
    }),
    { name: "agentcomm_app_v1" },
  ),
);

export function threadOf(s: Pick<State, "current" | "roomsData" | "dms">) {
  return currentThread(s as State);
}
