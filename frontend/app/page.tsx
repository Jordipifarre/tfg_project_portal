"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight, BarChart2, Table2, MessageCircle,
  ShieldCheck, Globe, Eye, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";

/* ── Animation helpers ──────────────────────────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.45, delay },
});

/* ── Three interaction modes ────────────────────────────────────────────── */
const MODES = [
  {
    icon: <Table2 size={28} className="text-[#1a3a52]" />,
    iconBg: "bg-[#1a3a52]/10",
    borderColor: "#1a3a52",
    title: "Explora les Dades",
    desc:
      "Navega les taules de dades oficials de Catalunya directament al navegador. Filtra, ordena i exporta registres de seguretat sense necessitat de coneixements tècnics.",
    cta: "Ves a l'explorador",
    href: "/explorer",
  },
  {
    icon: <BarChart2 size={28} className="text-[#15803d]" />,
    iconBg: "bg-[#15803d]/10",
    borderColor: "#15803d",
    title: "Visualitza Tendències",
    desc:
      "Comprèn els patrons de seguretat amb gràfics interactius. Veu l'evolució de les dades per any, per zona i per tipus d'incident, d'un cop d'ull.",
    cta: "Veu els dashboards",
    href: "/dashboard",
  },
  {
    icon: <MessageCircle size={28} className="text-[#d97706]" />,
    iconBg: "bg-[#d97706]/10",
    borderColor: "#d97706",
    title: "Pregunta en Català",
    desc:
      "Fes preguntes sobre les dades en el teu idioma. L'assistent analitza les bases de dades oficials i et respon amb xifres concretes i fàcils d'entendre.",
    cta: "Obrir l'assistent",
    href: "/chat",
  },
];

/* ── Trust pillars ──────────────────────────────────────────────────────── */
const PILLARS = [
  {
    icon: <Globe size={20} className="text-[#1a3a52]" />,
    title: "Dades Oficials",
    desc: "Tots els registres provenen de les Dades Obertes de la Generalitat de Catalunya, actualitzats periòdicament.",
  },
  {
    icon: <ShieldCheck size={20} className="text-[#15803d]" />,
    title: "Sense Registre",
    desc: "No cal crear cap compte ni facilitar dades personals. La plataforma és totalment pública i anònima.",
  },
  {
    icon: <Eye size={20} className="text-[#d97706]" />,
    title: "Transparent per Disseny",
    desc: "Tot el codi és obert i auditabble. Pots veure exactament com es processen les dades i com funciona l'assistent.",
  },
];

/* ── Datasets showcased ─────────────────────────────────────────────────── */
const DATASETS = [
  { label: "Infraccions Penals", desc: "Fets coneguts, resolts i detencions dels Mossos d'Esquadra", color: "#dc2626", href: "/dashboard/penal" },
  { label: "Aeroports",          desc: "Incidents registrats als aeroports de Catalunya",             color: "#0284c7", href: "/dashboard/airports" },
  { label: "Crims d'Odi",        desc: "Delictes i infraccions per discriminació i odi",               color: "#d97706", href: "/dashboard/hate-crimes" },
  { label: "Transport Públic",   desc: "Incidents al bus, metro, taxi i tren",                        color: "#15803d", href: "/dashboard/transport" },
];

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-24">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-16 pb-4 text-center space-y-8">
        <motion.div {...fadeUp(0)}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#e5e5e5] bg-white text-[#475569] text-xs font-medium shadow-sm">
            <ShieldCheck size={13} className="text-[#15803d]" />
            Dades oficials de la Generalitat de Catalunya
          </span>
        </motion.div>

        <motion.div {...fadeUp(0.08)}>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1f2937] leading-tight tracking-tight">
            La seguretat pública de Catalunya,<br />
            <span className="text-[#1a3a52]">explicada per a tothom.</span>
          </h1>
        </motion.div>

        <motion.p
          className="text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed"
          {...fadeUp(0.16)}
        >
          Una plataforma de transparència que transforma registres oficials de seguretat
          en informació clara, accessible i comprensible per a qualsevol ciutadà,
          sense necessitat de coneixements tècnics.
        </motion.p>

        <motion.div className="flex gap-3 justify-center flex-wrap" {...fadeUp(0.24)}>
          <Link href="/dashboard">
            <Button className="h-11 px-7 text-sm bg-[#1a3a52] hover:bg-[#0f2d42] text-white rounded-lg shadow-sm">
              Explora les dades
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
          <Link href="/chat">
            <Button
              variant="outline"
              className="h-11 px-7 text-sm border-[#e5e5e5] bg-white hover:bg-gray-50 text-[#1f2937] rounded-lg shadow-sm"
            >
              <MessageCircle size={16} className="mr-2 text-[#d97706]" />
              Fes una pregunta
            </Button>
          </Link>
        </motion.div>

        {/* Source badge */}
        <motion.p className="text-xs text-[#9ca3af]" {...fadeIn(0.35)}>
          Font:&nbsp;
          <span className="font-medium text-[#6b7280]">portal.gencat.cat/dades-obertes</span>
          &nbsp;·&nbsp;Mossos d&apos;Esquadra&nbsp;·&nbsp;Generalitat de Catalunya
        </motion.p>
      </section>

      {/* ── Three modes ───────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <motion.div className="text-center" {...fadeUp(0.1)}>
          <h2 className="text-2xl font-bold text-[#1f2937]">Tres maneres d&apos;accedir a les dades</h2>
          <p className="text-[#6b7280] mt-2 text-sm">Tria el format que millor s&apos;adapta a tu.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MODES.map((mode, i) => (
            <motion.div key={mode.title} {...fadeUp(0.1 + i * 0.08)}>
              <Link href={mode.href} className="group block h-full">
                <div
                  className="h-full rounded-lg border border-[#e5e5e5] border-t-4 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  style={{ borderTopColor: mode.borderColor }}
                >
                  <div className={`w-12 h-12 ${mode.iconBg} rounded-lg flex items-center justify-center mb-4 shrink-0`}>
                    {mode.icon}
                  </div>
                  <h3 className="text-base font-bold text-[#1f2937] mb-2">{mode.title}</h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed flex-1">{mode.desc}</p>
                  <div
                    className="flex items-center gap-1 text-xs font-medium mt-5 transition-colors"
                    style={{ color: mode.borderColor }}
                  >
                    {mode.cta}
                    <ChevronRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Datasets ──────────────────────────────────────────────────────── */}
      <section className="space-y-6">
        <motion.div {...fadeUp(0.05)}>
          <h2 className="text-2xl font-bold text-[#1f2937]">Conjunts de dades disponibles</h2>
          <p className="text-[#6b7280] mt-2 text-sm">
            Quatre bases de dades oficials, actualitzades periòdicament, accessibles de forma gratuïta.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DATASETS.map((ds, i) => (
            <motion.div key={ds.label} {...fadeUp(0.05 + i * 0.06)}>
              <Link href={ds.href} className="group block">
                <div className="rounded-lg border border-[#e5e5e5] bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: ds.color }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1f2937] group-hover:text-[#1a3a52] transition-colors">
                      {ds.label}
                    </p>
                    <p className="text-xs text-[#6b7280] mt-1 leading-relaxed">{ds.desc}</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-[#d1d5db] group-hover:text-[#1a3a52] transition-colors shrink-0 mt-0.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust pillars ─────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-[#e5e5e5] bg-white shadow-sm overflow-hidden">
        <div className="border-b border-[#e5e5e5] px-8 py-6">
          <h2 className="text-xl font-bold text-[#1f2937]">Per a qui és aquesta plataforma?</h2>
          <p className="text-[#6b7280] mt-1 text-sm leading-relaxed max-w-2xl">
            Dissenyada per a periodistes, investigadors, veïns curiosos, responsables polítics i qualsevol
            persona que vulgui entendre millor la seguretat al seu entorn.
            No calen coneixements tècnics.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#e5e5e5]">
          {PILLARS.map((p) => (
            <div key={p.title} className="px-8 py-6 space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gray-50 rounded-lg">{p.icon}</div>
                <h3 className="text-sm font-semibold text-[#1f2937]">{p.title}</h3>
              </div>
              <p className="text-xs text-[#6b7280] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="rounded-lg bg-[#1a3a52] p-10 text-center space-y-5 shadow-md">
        <motion.div {...fadeUp(0.05)}>
          <h2 className="text-2xl font-bold text-white">Comença a explorar ara</h2>
          <p className="text-white/70 mt-2 text-sm max-w-lg mx-auto leading-relaxed">
            Accedeix als dashboards, navega les taules o fes una pregunta directament
            a l&apos;assistent de dades. Tot és gratuït, públic i sense registre.
          </p>
        </motion.div>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/dashboard">
            <Button className="h-11 px-7 text-sm bg-white text-[#1a3a52] hover:bg-gray-100 rounded-lg font-semibold shadow-sm">
              Veure el dashboard
              <BarChart2 size={16} className="ml-2" />
            </Button>
          </Link>
          <Link href="/explorer">
            <Button
              variant="outline"
              className="h-11 px-7 text-sm border-white/30 bg-transparent hover:bg-white/10 text-white rounded-lg"
            >
              <Table2 size={16} className="mr-2" />
              Explorar les taules
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Mini footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-[#e5e5e5] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9ca3af]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#1a3a52]" />
          <span className="font-medium text-[#475569]">SeguretatCat</span>
          <span>·</span>
          <span>Treball de Fi de Grau · Universitat de Lleida · 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-[#1a3a52] transition-colors">Dashboard</Link>
          <Link href="/explorer"  className="hover:text-[#1a3a52] transition-colors">Explorador</Link>
          <Link href="/chat"      className="hover:text-[#1a3a52] transition-colors">Assistent</Link>
        </div>
      </footer>

    </div>
  );
}
