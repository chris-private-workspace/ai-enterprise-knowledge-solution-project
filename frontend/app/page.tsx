/**
 * V7 Landing page (`/`) — public entry per architecture.md v6 §5.9 + ADR-0015.
 *
 * Layout per ui-design-reference-v6.md §2.7 wireframe:
 *   Header → Hero → 3 Feature cards → How-it-works 3-step → Footer.
 *
 * Server Component (public route, no AuthProvider, no client state). Primary
 * CTA "Start asking" routes to /login per ADR-0014 hybrid auth (SSO + self-
 * register). "Watch demo" stays disabled until a recorded demo asset lands
 * post-Beta.
 *
 * Content discipline per architecture.md v6 §5.9 + CLAUDE.md §5.4 H4: all
 * feature claims ground 在已實 Tier 1 capability — no GraphRAG / multi-agent
 * / multi-tenancy / fine-tune leak. Layout reference Dify Image 1 marketing
 * pattern (no code copy per ADR-0010).
 */

import {
  CheckCircle2,
  FileText,
  MessageSquareQuote,
  Quote,
  Upload,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeatureHighlights />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          EKP
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <span
            className="cursor-not-allowed opacity-50"
            title="Pricing — post-launch"
          >
            Pricing
          </span>
          <span
            className="cursor-not-allowed opacity-50"
            title="Docs — post-launch"
          >
            Docs
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Enterprise Knowledge Platform
        </h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">
          Get answers from your documents — with citations.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Start asking →</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled
            title="Demo recording — post-Beta"
          >
            Watch demo
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeatureHighlights() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Built for grounded answers
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          Three building blocks tuned for internal manuals — not a chatbot
          stitched on top of generic search.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="h-5 w-5" />}
            title="Multi-format ingestion"
            description="Word, PDF, and PowerPoint parsed with layout-aware chunking — embedded screenshots stay linked to the answer that cites them."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Hybrid retrieval + CRAG"
            description="Azure AI Search hybrid (BM25 + vector) reranked, then a corrective loop (CRAG) catches low-confidence retrievals before generation."
          />
          <FeatureCard
            icon={<Quote className="h-5 w-5" />}
            title="Citation-grounded answers"
            description="Every claim links to the chunk it came from — section path, document title, and the original screenshot are one click away."
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
          {icon}
        </div>
        <CardTitle className="mt-3 text-lg">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <Upload className="h-5 w-5" />,
      title: 'Upload',
      description: 'Drop in Word / PDF / PowerPoint. Ingestion handles parsing, chunking, and embedding.',
    },
    {
      icon: <MessageSquareQuote className="h-5 w-5" />,
      title: 'Ask',
      description: 'Type a question. Hybrid retrieval + CRAG fetches the most relevant chunks across your KB.',
    },
    {
      icon: <CheckCircle2 className="h-5 w-5" />,
      title: 'Verify',
      description: 'Each answer cites the source chunk — open the citation card to see the original passage and screenshot.',
    },
  ];

  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto max-w-5xl px-4 py-16 md:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, idx) => (
            <li key={step.title} className="relative flex flex-col items-start gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  {step.icon}
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Step {idx + 1}
                </span>
              </div>
              <h3 className="text-lg font-medium">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
        <span>© Ricoh — Enterprise Knowledge Platform</span>
        <nav className="flex items-center gap-5">
          <span className="cursor-not-allowed opacity-50" title="Status — post-launch">
            Status
          </span>
          <span className="cursor-not-allowed opacity-50" title="Docs — post-launch">
            Docs
          </span>
          <span className="cursor-not-allowed opacity-50" title="Contact — post-launch">
            Contact
          </span>
          <span className="cursor-not-allowed opacity-50" title="Legal — post-launch">
            Legal
          </span>
        </nav>
      </div>
    </footer>
  );
}
