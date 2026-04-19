"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Database, Bot, FileText, Activity, ShieldAlert, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero Section */}
      <section className="pt-20 pb-10 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6 ring-1 ring-primary/20 text-sm font-medium">
            <Lock size={14} />
            <span>Privacy-first Open-Source Intelligence</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            Transforming Raw Safety Data <br />
            <span className="text-primary">into Actionable Intelligence</span>
          </h1>
          <p className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
            An advanced platform powered by localized Ollama AI models. 
            Analyze municipal incidents, crime trends, and safety reports instantly with natural language.
          </p>
        </motion.div>

        <motion.div 
          className="pt-8 flex gap-4 justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link href="/dashboard">
            <Button size="lg" className="h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-primary/25 transition-all">
              Go to Dashboard <Activity className="ml-2" size={20} />
            </Button>
          </Link>
          <Link href="/chat">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-xl shadow-sm hover:bg-muted/50 transition-all">
              Try Smart Chat <Bot className="ml-2 text-primary" size={20} />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Bento Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 auto-rows-[250px]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
          className="col-span-1 md:col-span-2 row-span-1 p-8 rounded-3xl bg-gradient-to-br from-card to-muted border border-border shadow-sm flex flex-col justify-between group overflow-hidden relative"
        >
          <div className="absolute -right-10 -top-10 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={150} />
          </div>
          <div className="z-10">
             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Database className="text-primary" size={24} />
             </div>
             <h3 className="text-2xl font-bold mb-2">Live Data Integration</h3>
             <p className="text-muted-foreground">Connecting directly to PostgreSQL via Supabase, accessing verified and up-to-date public safety records seamlessly.</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
          className="col-span-1 md:col-span-2 row-span-2 p-8 rounded-3xl bg-foreground text-background border shadow-xl flex flex-col justify-between overflow-hidden relative group"
        >
           <div className="absolute -bottom-20 -right-10 w-96 h-96 bg-primary/20 blur-3xl rounded-full group-hover:bg-primary/30 transition-colors" />
           <div className="z-10">
             <div className="w-12 h-12 bg-background/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm">
                <ShieldAlert className="text-background" size={24} />
             </div>
             <h3 className="text-3xl font-bold mb-4">Predictive Analytics Dashboard</h3>
             <p className="text-background/80 text-lg leading-relaxed mb-6">
               Visualize crime trends, incident density, and high-risk zones using interactive charts and maps. Give policymakers the overview they need to allocate resources efficiently.
             </p>
             <Link href="/dashboard" className="inline-flex items-center text-sm font-semibold hover:underline">
               Explore Analytics <ArrowRight size={16} className="ml-1" />
             </Link>
           </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
          className="col-span-1 md:col-span-1 row-span-1 p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between group flex-grow"
        >
          <div>
            <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
               <Bot className="text-green-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">SQL Agent</h3>
            <p className="text-muted-foreground text-sm">Translates natural language questions into precise database queries.</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }}
          className="col-span-1 md:col-span-1 row-span-1 p-8 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-between group flex-grow"
        >
          <div>
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-4">
               <FileText className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">RAG Pipeline</h3>
            <p className="text-muted-foreground text-sm">Grounds responses in official documents and law precedents.</p>
          </div>
        </motion.div>

      </section>
    </div>
  );
}