import matter from "gray-matter";

/**
 * The agent-neutral intermediate (SPEC §7): mask.md normalizes into a persona
 * unit, which each adapter renders into its own native format. Keeping this
 * layer explicit is what lets one mask compile to Claude Code, AGENTS.md, etc.
 */
export interface PersonaUnit {
  slug: string;
  name: string;
  /** "voice" (default) or "code" — selects the adapter's framing/template. */
  type: string;
  /** Routing blurb the host agent uses to pick this persona. */
  description: string;
  /** The mask.md body — the six-section profile (voice or conventions), verbatim. */
  voice_profile: string;
  source_kind?: string;
}

/** Parse a mask.md into a persona unit. `slug` (the library dir) is authoritative. */
export function toPersonaUnit(maskMd: string, slug: string): PersonaUnit {
  const { data, content } = matter(maskMd);
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) throw new Error("mask.md is missing `name` in its frontmatter");

  const voice_profile = content.trim();
  if (!voice_profile) throw new Error("mask.md has an empty profile (body)");

  const type = data.type === "code" || data.type === "blend" ? data.type : "voice";
  const defaultDescription =
    type === "code"
      ? `Code expert on ${name}.`
      : type === "blend"
        ? `Voice-neutral knowledge blend: ${name}.`
        : `Answer in the voice of ${name}.`;
  const description =
    typeof data.description === "string" && data.description.trim()
      ? data.description.trim()
      : defaultDescription;

  return {
    slug,
    name,
    type,
    description,
    voice_profile,
    source_kind: typeof data.source_kind === "string" ? data.source_kind : undefined,
  };
}

/** Substitute `{{key}}` literally (split/join avoids `$`-pattern interpretation). */
function fill(template: string, key: string, value: string): string {
  return template.split(`{{${key}}}`).join(value);
}

/**
 * Fill a persona template's `{{slug}}/{{name}}/{{description}}/{{voice_profile}}`
 * slots. Adapter-agnostic — used by both the Claude Code subagent and the
 * AGENTS.md active block (each references only the slots it needs).
 */
export function renderPersona(template: string, unit: PersonaUnit): string {
  let out = template;
  out = fill(out, "slug", unit.slug);
  out = fill(out, "name", unit.name);
  out = fill(out, "description", unit.description);
  out = fill(out, "voice_profile", unit.voice_profile);
  return out;
}

/** Render a persona unit into a Claude Code subagent file via its .hbs template. */
export function renderSubagent(template: string, unit: PersonaUnit): string {
  return renderPersona(template, unit);
}
