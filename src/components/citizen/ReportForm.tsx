'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Camera, MapPin, Loader2, CheckCircle2, AlertTriangle, XCircle,
  ArrowLeft, ShieldCheck,
} from 'lucide-react'
import {
  type IssueType, type AIResult, ISSUE_TYPE_META,
} from '@/lib/types'

type VerifyingState = 'idle' | 'verifying' | 'verified' | 'uncertain' | 'rejected'

interface DetectionInfo {
  result: AIResult
  confidence: number
  reasoning: string
}

interface ReportFormProps {
  onSubmitted: (issueId: string) => void
  onBack: () => void
}

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 }

export function ReportForm({ onSubmitted, onBack }: ReportFormProps) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [issueType, setIssueType] = useState<IssueType | ''>('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const [verifyState, setVerifyState] = useState<VerifyingState>('idle')
  const [detection, setDetection] = useState<DetectionInfo | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const detectLocation = () => {
    setGeoLoading(true)
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported. Using default Chennai location.')
      setLat(CHENNAI_CENTER.lat)
      setLng(CHENNAI_CENTER.lng)
      setAddress('Chennai, Tamil Nadu (default)')
      setGeoLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setAddress(`Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`)
        toast.success('Location detected!')
        setGeoLoading(false)
      },
      (err) => {
        toast.error(`Location detection failed: ${err.message}. Using default Chennai location.`)
        setLat(CHENNAI_CENTER.lat + (Math.random() - 0.5) * 0.05)
        setLng(CHENNAI_CENTER.lng + (Math.random() - 0.5) * 0.05)
        setAddress('Chennai, Tamil Nadu (approx)')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Auto-detect location on mount
  if (lat === null && !geoLoading) {
    setGeoLoading(true)
    setTimeout(detectLocation, 0)
  }

  const onFileSelected = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPhotoDataUrl(dataUrl)
      setPhotoPreview(dataUrl)
      setVerifyState('verifying')
      setDetection(null)

      try {
        const resp = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        })
        const data = await resp.json()
        if (!resp.ok || !data.success) {
          throw new Error(data.error || data.details || 'Detection failed')
        }
        setDetection({
          result: data.result,
          confidence: data.confidence,
          reasoning: data.reasoning || '',
        })
        if (data.result === 'real') setVerifyState('verified')
        else if (data.result === 'uncertain') setVerifyState('uncertain')
        else setVerifyState('rejected')
      } catch (err) {
        console.error(err)
        toast.error('AI verification failed. Please try a different photo.')
        setVerifyState('idle')
        setPhotoDataUrl(null)
        setPhotoPreview(null)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!photoDataUrl) { toast.error('Please upload a photo first.'); return }
    if (verifyState === 'verifying') { toast.error('Please wait for AI verification to complete.'); return }
    if (verifyState === 'rejected') { toast.error('Cannot submit: AI-generated image detected.'); return }
    if (!issueType) { toast.error('Please select an issue type.'); return }
    if (lat === null || lng === null) { toast.error('Please detect your location.'); return }

    setSubmitting(true)
    try {
      // 1. Upload the image
      const uploadResp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: photoDataUrl }),
      })
      const uploadData = await uploadResp.json()
      if (!uploadResp.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Image upload failed')
      }
      const photoUrl = uploadData.url as string

      // 2. Create the issue
      const createResp = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: issueType,
          photoUrl,
          description,
          lat, lng,
          address,
          ward: 'Ward-12',
          aiResult: detection!.result,
          aiConfidence: detection!.confidence,
          aiApiUsed: 'vlm-zai',
        }),
      })
      const createData = await createResp.json()
      if (!createResp.ok || !createData.success) {
        throw new Error(createData.error || 'Failed to create issue')
      }
      toast.success('Issue submitted successfully!')
      onSubmitted(createData.issue.issueId)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = photoDataUrl && verifyState !== 'verifying' && verifyState !== 'rejected' && issueType && lat !== null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Report an Issue</h1>
          <p className="text-muted-foreground mt-1">Submit a civic issue with AI-verified photo</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">1</span>
                Upload Photo
              </CardTitle>
              <CardDescription>
                Our AI will instantly verify if your photo is real or AI-generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) onFileSelected(f)
                }}
              />

              {!photoPreview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-accent/30 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <div className="font-medium">Click to upload or take a photo</div>
                    <div className="text-sm text-muted-foreground mt-1">JPG, PNG, WebP — max 8MB</div>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border">
                    { }
                    <img src={photoPreview} alt="Selected issue" className="w-full max-h-80 object-cover" />
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm" variant="secondary"
                        onClick={() => { setPhotoPreview(null); setPhotoDataUrl(null); setVerifyState('idle'); setDetection(null) }}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {verifyState === 'verifying' && (
                    <Alert className="border-primary/30 bg-primary/5">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <AlertTitle className="text-primary">Verifying your photo…</AlertTitle>
                      <AlertDescription className="text-primary/80">
                        Our AI model is checking if this is a real photograph or AI-generated. This usually takes a few seconds.
                      </AlertDescription>
                    </Alert>
                  )}

                  {verifyState === 'verified' && detection && (
                    <Alert className="border-green-600/40 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-700" />
                      <AlertTitle className="text-green-800">Photo Verified — Real Photograph ✅</AlertTitle>
                      <AlertDescription className="text-green-700">
                        Confidence: <strong>{Math.round(detection.confidence * 100)}%</strong>
                        {detection.reasoning && <span className="block mt-1 text-xs italic">{detection.reasoning}</span>}
                      </AlertDescription>
                    </Alert>
                  )}

                  {verifyState === 'uncertain' && detection && (
                    <Alert className="border-amber-500/50 bg-amber-50">
                      <AlertTriangle className="h-4 w-4 text-amber-700" />
                      <AlertTitle className="text-amber-800">Photo Under Review ⚠️</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        Confidence: <strong>{Math.round(detection.confidence * 100)}%</strong>. The issue can still be submitted, but a municipality officer will manually review the photo.
                        {detection.reasoning && <span className="block mt-1 text-xs italic">{detection.reasoning}</span>}
                      </AlertDescription>
                    </Alert>
                  )}

                  {verifyState === 'rejected' && detection && (
                    <Alert className="border-red-600/50 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-700" />
                      <AlertTitle className="text-red-800">AI-Generated Image Detected ❌</AlertTitle>
                      <AlertDescription className="text-red-700">
                        This photo appears to be AI-generated (confidence {Math.round(detection.confidence * 100)}%).
                        Please upload a real photograph taken with your camera.
                        {detection.reasoning && <span className="block mt-1 text-xs italic">{detection.reasoning}</span>}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">2</span>
                Issue Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issue-type" className="mb-1.5 block">Issue Type</Label>
                <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                  <SelectTrigger id="issue-type">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ISSUE_TYPE_META) as IssueType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="mr-2">{ISSUE_TYPE_META[t].emoji}</span>
                        {ISSUE_TYPE_META[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="mb-1.5 block">Description (optional, max 200 chars)</Label>
                <Textarea
                  id="description"
                  value={description}
                  maxLength={200}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Large pothole near the bus stop causing traffic"
                  rows={3}
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{description.length}/200</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">3</span>
                Location
              </CardTitle>
              <CardDescription>GPS coordinates are auto-detected</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  {lat !== null && lng !== null ? (
                    <>
                      <div className="font-medium text-sm truncate">{address || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`}</div>
                      <div className="text-xs text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Detecting your location…
                    </div>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={detectLocation} disabled={geoLoading}>
                  {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-detect'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Tip: Allow location access in your browser for accurate reporting. If denied, we&apos;ll use a default Chennai location.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={onBack}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting} size="lg">
              {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</> : <>Submit Issue</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Success screen ────────────────────────────────────────────────
export function ReportSuccess({ issueId, onTrack, onBackHome }: {
  issueId: string
  onTrack: () => void
  onBackHome: () => void
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 px-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-700" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Issue Submitted! 🎉</h2>
          <p className="text-muted-foreground mb-4">Your civic issue has been recorded and forwarded to the municipality.</p>

          <div className="bg-muted/50 rounded-lg p-4 mb-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Issue ID</div>
            <div className="font-mono text-xl font-bold text-primary">{issueId}</div>
          </div>

          <p className="text-sm text-muted-foreground mb-5">
            Save this ID to track the status of your issue. You can also use the shareable tracking link.
          </p>

          <div className="flex flex-col gap-2">
            <Button onClick={onTrack} size="lg">
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Track This Issue
            </Button>
            <Button variant="outline" onClick={onBackHome}>Report Another Issue</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
