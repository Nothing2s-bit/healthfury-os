import { useState } from "react";

export type SymptomIntake = {
  mainSymptom: string;
  duration: string;
  severity: number;
  location: string;
  associated: string[];
  ageGroup: string;
  conditions: string;
  redFlags: string[];
};

const DURATIONS = ["< 24 hours", "1–3 days", "4–7 days", "1–4 weeks", "> 1 month"];
const AGES = ["Infant (<2)", "Child (2–12)", "Teen (13–17)", "Adult (18–64)", "Senior (65+)"];
const ASSOCIATED = [
  "Fever",
  "Cough",
  "Fatigue",
  "Nausea / vomiting",
  "Headache",
  "Rash",
  "Sore throat",
  "Body aches",
  "Diarrhea",
];
const RED_FLAGS = [
  "Chest pain or pressure",
  "Trouble breathing",
  "Severe bleeding",
  "Sudden severe headache",
  "Fainting / confusion",
  "Signs of stroke (face droop, weakness)",
];

function toggle(arr: string[], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function SymptomChecklist({
  onSubmit,
  disabled,
}: {
  onSubmit: (summary: string, data: SymptomIntake) => void;
  disabled?: boolean;
}) {
  const [mainSymptom, setMainSymptom] = useState("");
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [severity, setSeverity] = useState(4);
  const [location, setLocation] = useState("");
  const [associated, setAssociated] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState(AGES[3]);
  const [conditions, setConditions] = useState("");
  const [redFlags, setRedFlags] = useState<string[]>([]);

  const canSubmit = mainSymptom.trim().length > 2 && !disabled;

  const submit = () => {
    if (!canSubmit) return;
    const data: SymptomIntake = {
      mainSymptom: mainSymptom.trim(),
      duration,
      severity,
      location: location.trim(),
      associated,
      ageGroup,
      conditions: conditions.trim(),
      redFlags,
    };
    const lines = [
      "Please review my symptom intake and give safe next-step guidance.",
      "",
      `- Main symptom: ${data.mainSymptom}`,
      `- Duration: ${data.duration}`,
      `- Severity (1–10): ${data.severity}`,
      data.location && `- Location on body: ${data.location}`,
      `- Age group: ${data.ageGroup}`,
      `- Associated symptoms: ${data.associated.length ? data.associated.join(", ") : "none reported"}`,
      `- Existing conditions / medications: ${data.conditions || "none reported"}`,
      `- Red-flag symptoms present: ${data.redFlags.length ? data.redFlags.join(", ") : "none"}`,
    ]
      .filter(Boolean)
      .join("\n");
    onSubmit(lines, data);
  };

  const label = "font-display text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.12_75)]";
  const inputCls =
    "mt-1 w-full rounded-md border border-[oklch(0.82_0.1_80)] bg-white px-2.5 py-1.5 text-sm text-foreground focus:border-[oklch(0.72_0.14_75)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.72_0.14_75_/_0.3)]";
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] transition ${
      active
        ? "border-[oklch(0.6_0.15_65)] bg-[oklch(0.6_0.15_65)] text-white shadow"
        : "border-[oklch(0.82_0.1_80)] bg-white text-foreground/70 hover:bg-[oklch(0.96_0.05_80)]"
    }`;

  return (
    <div className="rounded-lg border border-[oklch(0.82_0.1_80)] bg-white/80 p-4 shadow-sm">
      <p className="font-display text-sm font-semibold text-[oklch(0.45_0.12_75)]">
        Symptom intake
      </p>
      <p className="mt-0.5 font-body text-xs text-foreground/70">
        Fill this in first — it helps me give you safer, more relevant guidance.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className={label}>Main symptom</label>
          <input
            className={inputCls}
            placeholder="e.g. sore throat, headache, stomach pain"
            value={mainSymptom}
            onChange={(e) => setMainSymptom(e.target.value)}
          />
        </div>

        <div>
          <label className={label}>How long?</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => (
              <button
                type="button"
                key={d}
                className={chip(duration === d)}
                onClick={() => setDuration(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>
            Severity: <span className="text-foreground">{severity}/10</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="mt-1 w-full accent-[oklch(0.6_0.15_65)]"
          />
        </div>

        <div>
          <label className={label}>Location on body (optional)</label>
          <input
            className={inputCls}
            placeholder="e.g. lower right abdomen"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Age group</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {AGES.map((a) => (
              <button
                type="button"
                key={a}
                className={chip(ageGroup === a)}
                onClick={() => setAgeGroup(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Associated symptoms</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ASSOCIATED.map((a) => (
              <button
                type="button"
                key={a}
                className={chip(associated.includes(a))}
                onClick={() => setAssociated((prev) => toggle(prev, a))}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Existing conditions / medications (optional)</label>
          <input
            className={inputCls}
            placeholder="e.g. asthma, taking ibuprofen"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Red-flag symptoms (tap any that apply)</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {RED_FLAGS.map((r) => {
              const active = redFlags.includes(r);
              return (
                <button
                  type="button"
                  key={r}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    active
                      ? "border-[oklch(0.5_0.19_25)] bg-[oklch(0.5_0.19_25)] text-white shadow"
                      : "border-[oklch(0.7_0.19_25_/_0.5)] bg-white text-[oklch(0.4_0.15_25)] hover:bg-[oklch(0.98_0.03_35)]"
                  }`}
                  onClick={() => setRedFlags((prev) => toggle(prev, r))}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {redFlags.length > 0 && (
            <p className="mt-2 text-[11px] font-semibold text-[oklch(0.4_0.18_25)]">
              These may need urgent care. If severe or worsening, call emergency services now.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="mt-1 w-full rounded-full bg-gradient-to-br from-[oklch(0.78_0.14_80)] to-[oklch(0.55_0.13_65)] py-2 font-display text-sm font-semibold uppercase tracking-wider text-white shadow disabled:opacity-40"
        >
          Continue to AI guidance
        </button>
      </div>
    </div>
  );
}