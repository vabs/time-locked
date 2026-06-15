import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import {
  Archive,
  Bell,
  CheckCircle2,
  Clock,
  LockKeyhole,
  NotebookPen,
  Pause,
  Tags,
} from "lucide-react";

const STEPS = [
  {
    label: "Write the decision",
    text: "Capture the choice, the stakes, and the reason it feels urgent before momentum takes over.",
  },
  {
    label: "Lock the timer",
    text: "Choose a deliberate waiting period, from one hour to one week, and let the decision breathe.",
  },
  {
    label: "Track the thinking",
    text: "Add notes whenever new concerns, tradeoffs, or ideas surface during the lock.",
  },
  {
    label: "Record the outcome",
    text: "When time expires, decide with context and keep a record of how your judgment evolved.",
  },
];

const FEATURES = [
  { icon: Clock, label: "Decision timers", text: "Preset waits for quick pauses or longer cooling-off periods." },
  { icon: NotebookPen, label: "Running notes", text: "Keep every new thought attached to the original decision." },
  { icon: Pause, label: "Pause and resume", text: "Freeze a countdown when the real world interrupts it." },
  { icon: Archive, label: "Stopped decisions", text: "Abandon a lock without deleting the record." },
  { icon: Tags, label: "Tags", text: "Separate financial, career, health, work, and personal choices." },
  { icon: Bell, label: "Push alerts", text: "Know when a lock opens, even after installing the PWA." },
];

const SIGNALS = ["Minimum 1-hour lock", "Offline-ready PWA", "Private decision history"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-primary">
            <Clock className="h-5 w-5" />
            <span>Time Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Get started
              </button>
            </SignUpButton>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-20 lg:pt-16">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            {SIGNALS.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {signal}
              </span>
            ))}
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Make fewer decisions in a rush.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Time Locked is a decision journal that adds deliberate friction before action. Write down
            what you are considering, lock it behind a timer, and use the waiting period to collect
            the thinking that usually arrives too late.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SignUpButton mode="modal">
              <button className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                Start a decision journal
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-5 text-sm font-semibold transition-colors hover:bg-accent">
                Sign in
              </button>
            </SignInButton>
          </div>
        </div>

        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Should I accept the offer?</p>
                <p className="mt-1 text-xs text-muted-foreground">Career · locked for 24 hours</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="py-6">
            <div className="mb-3 flex items-end justify-between">
              <span className="text-sm font-medium text-muted-foreground">Time remaining</span>
              <span className="text-2xl font-bold tabular-nums">18:42:09</span>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-secondary">
              <div className="h-full w-[31%] bg-primary" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">New note</p>
              <p className="mt-2 text-sm leading-6">
                I am reacting to relief more than long-term fit. Ask about manager expectations before
                deciding.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-semibold text-amber-700">Running</p>
              </div>
              <div className="rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-1 text-sm font-semibold">4 captured</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-secondary/45">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-primary">The concept</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">A cooling-off period with memory.</h2>
          </div>
          <div className="space-y-5 text-base leading-8 text-muted-foreground">
            <p>
              Most bad decisions do not come from a lack of intelligence. They come from speed,
              pressure, and the confidence of the first story that sounds good enough.
            </p>
            <p>
              Time Locked turns hesitation into a system. The timer prevents immediate action, while
              notes preserve the details that emerge after the initial impulse fades.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">How it works</p>
          <h2 className="mt-3 text-3xl font-bold">From impulse to recorded judgment.</h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <article key={step.label} className="rounded-md border bg-card p-5">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </div>
              <h3 className="font-semibold">{step.label}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-sm font-semibold text-primary">Product details</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight">Built for the whole decision lifecycle.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, label, text }) => (
              <article key={label} className="rounded-md border bg-card p-5">
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 font-semibold">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Give important choices a second pass.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start with one decision you would normally make too quickly.
            </p>
          </div>
          <SignUpButton mode="modal">
            <button className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Create your first lock
            </button>
          </SignUpButton>
        </div>
      </section>

      <footer className="border-t px-5 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-muted-foreground">
          <span>Time Locked</span>
          <span>Decision history, not decision noise.</span>
        </div>
      </footer>
    </main>
  );
}
