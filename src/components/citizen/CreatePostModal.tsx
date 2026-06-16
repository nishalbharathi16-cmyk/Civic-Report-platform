'use client'

import { useState, useRef } from 'react'
import {
  Camera, Loader2, CheckCircle2, AlertTriangle, XCircle,
  MapPin, ShieldCheck, Sparkles, Type as TypeIcon, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  type IssueType, type AIResult,
  ISSUE_TYPE_META, AI_RESULT_META,
} from '@/lib/types'
import { cn } from '@/lib/utils'

type VerifyState = 'idle' | 'verifying' | 'verified' | 'uncertain' | 'rejected'

interface Detection {
  result: AIResult
  confidence: number
  reasoning: string
}

interface CreatePostModalProps {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  deviceId: string
  handle: string
  avatar: string
}

const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 }

const ISSUE_TYPES = Object.keys(ISSUE_TYPE_META) as IssueType[]

export function CreatePostModal({
  open, onClose, onSubmitted, deviceId, handle, avatar,
}: CreatePostModalProps) {
  const [step, setStep] = useState<'upload' | 'details' | 'submitting'>('upload')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [issueType, setIssueType] = useState<IssueType | ''>('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState>('idle')
  const [detection, setDetection] = useState<Detection | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload')
    setPhotoDataUrl(null)
    setIssueType('')
    setDescription('')
    setLat(null)
    setLng(null)
    setAddress('')
    setVerifyState('idle')
    setDetection(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const detectLocation = () => {
    setGeoLoading(true)
    if (!navigator.geolocation) {
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
        setGeoLoading(false)
      },
      () => {
        setLat(CHENNAI_CENTER.lat + (Math.random() - 0.5) * 0.05)
        setLng(CHENNAI_CENTER.lng + (Math.random() - 0.5) * 0.05)
        setAddress('Chennai, Tamil Nadu (approx)')
        setGeoLoading(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Kick off location detection on first detail step
  const goToDetails = () => {
    setStep('details')
    if (lat === null) detectLocation()
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
      setVerifyState('verifying')
      setDetection(null)
      try {
        const resp = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: dataUrl }),
        })
        const data = await resp.json()
        if (!resp.ok || !data.success) throw new Error(data.error || 'Detection failed')
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
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!photoDataUrl || !detection || !issueType || lat === null) return
    if (verifyState === 'rejected') {
      toast.error('Cannot post: AI-generated image detected.')
      return
    }
    setStep('submitting')
    try {
      const uploadResp = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: photoDataUrl }),
      })
      const uploadData = await uploadResp.json()
      if (!uploadResp.ok || !uploadData.success) throw new Error('Upload failed')
      const photoUrl = uploadData.url as string

      const createResp = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: issueType,
          photoUrl,
          description,
          lat, lng, address,
          ward: 'Ward-12',
          aiResult: detection.result,
          aiConfidence: detection.confidence,
          aiApiUsed: 'vlm-zai',
          authorName: handle,
          authorAvatar: avatar,
        }),
      })
      const createData = await createResp.json()
      if (!createResp.ok || !createData.success) throw new Error(createData.error || 'Failed to create post')

      toast.success('Posted to CivicGram! 🎉')
      reset()
      onSubmitted()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Submission failed')
      setStep('details')
    }
  }

  const canGoToDetails = photoDataUrl && verifyState !== 'verifying' && verifyState !== 'rejected'
  const canSubmit = photoDataUrl && detection && issueType && lat !== null && verifyState !== 'rejected' && verifyState !== 'verifying'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
          <button
            onClick={() => step === 'details' ? setStep('upload') : handleClose()}
            className="text-sm font-medium hover:opacity-70"
          >
            {step === 'details' ? '← Back' : 'Cancel'}
          </button>
          <DialogTitle className="text-base font-semibold">New Post</DialogTitle>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || step === 'submitting'}
            className={cn(
              'text-sm font-semibold',
              canSubmit && step !== 'submitting' ? 'text-primary hover:opacity-70' : 'text-muted-foreground/50'
            )}
          >
            {step === 'submitting' ? 'Posting…' : 'Share'}
          </button>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {/* STEP 1: Upload + AI verify */}
          {step === 'upload' && (
            <div>
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

              {!photoDataUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-square flex flex-col items-center justify-center gap-3 hover:bg-accent/30 transition-colors bg-muted/30"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center px-4">
                    <div className="font-semibold text-base">Upload a photo of the issue</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Take a real photo — our AI will verify it&apos;s authentic
                    </div>
                  </div>
                </button>
              ) : (
                <>
                  <div className="relative bg-black">
                    <img src={photoDataUrl} alt="Selected" className="w-full max-h-[60vh] object-contain" />
                    {verifyState !== 'idle' && (
                      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <VerificationBanner state={verifyState} detection={detection} />
                      </div>
                    )}
                    <button
                      onClick={() => { setPhotoDataUrl(null); setVerifyState('idle'); setDetection(null) }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                      <span>
                        Every photo is scanned by an AI model to detect fake AI-generated images. Fake reports never reach the municipality.
                      </span>
                    </div>

                    <Button
                      onClick={goToDetails}
                      disabled={!canGoToDetails}
                      className="w-full"
                      size="lg"
                    >
                      Next: Add details →
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: Details */}
          {step === 'details' && photoDataUrl && (
            <div className="p-4 space-y-4">
              {/* Photo preview small */}
              <div className="flex gap-3 items-center">
                <img src={photoDataUrl} alt="Preview" className="h-16 w-16 rounded-md object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{handle}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="text-base leading-none">{avatar}</span>
                    Your account
                  </div>
                </div>
              </div>

              {/* AI badge summary */}
              {detection && (
                <div className={cn(
                  'flex items-center gap-2 p-2 rounded-md text-xs font-medium',
                  verifyState === 'verified' && 'bg-emerald-50 text-emerald-700',
                  verifyState === 'uncertain' && 'bg-amber-50 text-amber-700',
                  verifyState === 'rejected' && 'bg-red-50 text-red-700',
                )}>
                  {verifyState === 'verified' && <CheckCircle2 className="h-4 w-4" />}
                  {verifyState === 'uncertain' && <AlertTriangle className="h-4 w-4" />}
                  {verifyState === 'rejected' && <XCircle className="h-4 w-4" />}
                  <span className="flex-1">
                    {AI_RESULT_META[detection.result].label} · {Math.round(detection.confidence * 100)}% confidence
                  </span>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Caption</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue. e.g. Massive pothole near the bus stop, two bikes skidded this morning 🙏"
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">{description.length}/500</div>
              </div>

              {/* Issue type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Issue Type</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {ISSUE_TYPES.map((t) => {
                    const meta = ISSUE_TYPE_META[t]
                    const active = issueType === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setIssueType(t)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-md border transition-all',
                          active
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-foreground/30'
                        )}
                      >
                        <span className="text-xl">{meta.emoji}</span>
                        <span className="text-[10px] font-medium">{meta.label.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Location</label>
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/40 border border-border">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    {lat !== null && lng !== null ? (
                      <>
                        <div className="text-sm font-medium truncate">{address || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`}</div>
                        <div className="text-[11px] text-muted-foreground">{lat.toFixed(6)}, {lng.toFixed(6)}</div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {geoLoading ? <><Loader2 className="h-3 w-3 animate-spin" /> Detecting…</> : 'No location'}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={detectLocation} disabled={geoLoading}>
                    {geoLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Re-detect'}
                  </Button>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2">
                <Sparkles className="h-3 w-3 text-primary" />
                Your post will be visible in the public feed and forwarded to municipality officers.
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full"
                size="lg"
              >
                {step === 'submitting' ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Posting…</> : 'Share to CivicGram'}
              </Button>
            </div>
          )}

          {/* STEP 3: Submitting */}
          {step === 'submitting' && (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-sm font-medium">Posting your issue…</div>
              <div className="text-xs text-muted-foreground">Uploading photo & creating post</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Verification banner shown over photo ──────────────────────────
function VerificationBanner({
  state, detection,
}: {
  state: VerifyState
  detection: Detection | null
}) {
  if (state === 'verifying') {
    return (
      <div className="flex items-center gap-2 text-white text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-medium">AI is verifying your photo…</span>
      </div>
    )
  }
  if (!detection) return null
  const meta = AI_RESULT_META[detection.result]
  return (
    <div className="flex items-center gap-2 text-white text-sm">
      {state === 'verified' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
      {state === 'uncertain' && <AlertTriangle className="h-4 w-4 text-amber-400" />}
      {state === 'rejected' && <XCircle className="h-4 w-4 text-red-400" />}
      <span className="font-medium">{meta.label}</span>
      <span className="opacity-80">· {Math.round(detection.confidence * 100)}% confidence</span>
    </div>
  )
}
