import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CAMERA_PAN_ORDER as ORDER, type CameraPan } from './scene/Room'

/** Mobile-only look left/center/right toggle — see Room's PAN_BY_VIEW for the camera-side shift. */
export function CameraPanControls({
  view,
  onChange,
  disabled = false,
}: {
  view: CameraPan
  onChange: (view: CameraPan) => void
  disabled?: boolean
}) {
  const index = ORDER.indexOf(view)

  const go = (dir: -1 | 1) => {
    const next = ORDER[index + dir]
    if (next) onChange(next)
  }

  return (
    <div className={`camera-pan${disabled ? ' is-disabled' : ''}`}>
      <button
        className="camera-pan__btn"
        onClick={() => go(-1)}
        disabled={disabled || index === 0}
        aria-label="Look left"
      >
        <ChevronLeft size={22} />
      </button>
      <div className="camera-pan__dots">
        {ORDER.map((v) => (
          <span key={v} className={`camera-pan__dot${v === view ? ' is-active' : ''}`} />
        ))}
      </div>
      <button
        className="camera-pan__btn"
        onClick={() => go(1)}
        disabled={disabled || index === ORDER.length - 1}
        aria-label="Look right"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  )
}
