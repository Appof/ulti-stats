import { useRef, useEffect, useState } from 'react'
import SignaturePadLib from 'signature_pad'
import { Button } from './button'
import { Eraser, Check } from 'lucide-react'

interface SignaturePadProps {
  onSave: (signature: string) => void
  initialValue?: string
  disabled?: boolean
  label: string
}

export function SignaturePad({ onSave, initialValue, disabled, label }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLib | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [isSaved, setIsSaved] = useState(!!initialValue)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    canvas.getContext('2d')?.scale(ratio, ratio)

    signaturePadRef.current = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    })

    // Load initial value if exists
    if (initialValue) {
      signaturePadRef.current.fromDataURL(initialValue, {
        width: canvas.offsetWidth,
        height: canvas.offsetHeight,
      })
      setIsEmpty(false)
      setIsSaved(true)
    }

    signaturePadRef.current.addEventListener('beginStroke', () => {
      setIsEmpty(false)
      setIsSaved(false)
    })

    if (disabled) {
      signaturePadRef.current.off()
    }

    return () => {
      signaturePadRef.current?.off()
    }
  }, [initialValue, disabled])

  const handleClear = () => {
    signaturePadRef.current?.clear()
    setIsEmpty(true)
    setIsSaved(false)
  }

  const handleSave = () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) return
    
    const dataUrl = signaturePadRef.current.toDataURL('image/png')
    onSave(dataUrl)
    setIsSaved(true)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-32 border rounded-md ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-crosshair'
          } ${isSaved ? 'border-green-500 border-2' : 'border-gray-300'}`}
          style={{ touchAction: 'none' }}
        />
        {isSaved && (
          <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            disabled={isEmpty}
          >
            <Eraser className="mr-1 h-3 w-3" />
            Clear
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isEmpty || isSaved}
          >
            <Check className="mr-1 h-3 w-3" />
            {isSaved ? 'Saved' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}

