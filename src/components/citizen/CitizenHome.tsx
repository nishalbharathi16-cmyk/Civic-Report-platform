'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, ShieldCheck, MapPin, Clock, Camera, Building2, Users, Sparkles } from 'lucide-react'

interface CitizenHomeProps {
  onReport: () => void
  onTrack: () => void
  onAdminLogin: () => void
}

export function CitizenHome({ onReport, onTrack, onAdminLogin }: CitizenHomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-12 text-center max-w-5xl">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
          <Sparkles className="h-3.5 w-3.5" /> AI-Powered Civic Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Report civic issues with <span className="text-primary">AI-verified</span> photos
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Snap a photo of a pothole, garbage, broken streetlight, or water leak. Our AI instantly detects fake AI-generated images — only real photos reach the municipality.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={onReport} className="text-base h-12 px-8">
            <Camera className="h-5 w-5 mr-2" /> Report an Issue
          </Button>
          <Button size="lg" variant="outline" onClick={onTrack} className="text-base h-12 px-8">
            Track an Issue
          </Button>
        </div>
      </section>

      {/* Feature cards */}
      <section className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6 text-green-700" />}
            title="AI Image Authentication"
            description="Every photo is scanned by an AI model to detect AI-generated or manipulated images. Fake reports never reach the municipality."
            color="bg-green-100"
          />
          <FeatureCard
            icon={<MapPin className="h-6 w-6 text-primary" />}
            title="GPS Auto-Detection"
            description="Your browser geolocation auto-fills coordinates, so officers know exactly where to send field teams."
            color="bg-primary/10"
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6 text-amber-700" />}
            title="Real-time Tracking"
            description="Get a unique Issue ID and watch status updates: Pending → In Progress → Resolved, with timestamps."
            color="bg-amber-100"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <h2 className="text-2xl font-bold text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StepCard num={1} icon={<Camera className="h-5 w-5" />} title="Upload a photo" desc="Take a real photo of the civic issue" />
          <StepCard num={2} icon={<ShieldCheck className="h-5 w-5" />} title="AI verifies it" desc="Our model checks if it's real or AI-generated" />
          <StepCard num={3} icon={<MapPin className="h-5 w-5" />} title="Add location & type" desc="GPS auto-filled, pick issue category" />
          <StepCard num={4} icon={<Clock className="h-5 w-5" />} title="Track status" desc="Get an Issue ID and follow updates" />
        </div>
      </section>

      {/* Role cards */}
      <section className="container mx-auto px-4 py-12 max-w-5xl">
        <h2 className="text-2xl font-bold text-center mb-8">Three roles, one platform</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RoleCard
            icon={<Users className="h-5 w-5" />}
            title="Citizen"
            tag="Public · No login"
            description="Report issues in under 30 seconds and track status with a unique ID."
            action={<Button onClick={onReport} variant="outline" className="w-full">Report Issue</Button>}
          />
          <RoleCard
            icon={<Building2 className="h-5 w-5" />}
            title="Municipality Officer"
            tag="Admin login"
            description="View live map of issues, update status, review AI-flagged photos."
            action={<Button onClick={onAdminLogin} variant="outline" className="w-full">Officer Login</Button>}
          />
          <RoleCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Super Admin"
            tag="Highest privilege"
            description="Manage officers, view cross-ward analytics, audit AI detection logs."
            action={<Button onClick={onAdminLogin} variant="outline" className="w-full">Super Admin Login</Button>}
          />
        </div>
      </section>

      <footer className="container mx-auto px-4 py-8 max-w-5xl text-center text-sm text-muted-foreground border-t mt-8">
        <p>Community Issue Tracker v2.0 · AI-Powered Civic Platform · Hackathon Build</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <h3 className="font-semibold mb-1.5">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ num, icon, title, desc }: {
  num: number
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="relative bg-card border rounded-lg p-4 text-center">
      <div className="absolute -top-2 -left-2 bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
        {icon}
      </div>
      <div className="font-medium text-sm mb-1">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </div>
  )
}

function RoleCard({ icon, title, tag, description, action }: {
  icon: React.ReactNode
  title: string
  tag: string
  description: string
  action: React.ReactNode
}) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
            {icon}
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{tag}</span>
        </div>
        <CardTitle className="text-base mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        {action}
      </CardContent>
    </Card>
  )
}
