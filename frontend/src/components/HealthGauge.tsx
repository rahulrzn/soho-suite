import { useId } from 'react'

export function HealthGauge({ score }: { score: number }) {
  const gradientId = useId().replaceAll(':', '')
  const size = 208
  const stroke = 15
  const radius = (size - stroke) / 2
  const centerX = size / 2
  const centerY = size / 2
  const circumference = Math.PI * radius
  const normalizedScore = Math.max(0, Math.min(100, score))
  const endAngle = Math.PI * (1 - normalizedScore / 100)
  const endpointX = centerX + radius * Math.cos(endAngle)
  const endpointY = centerY - radius * Math.sin(endAngle)
  const arc = `M ${stroke / 2} ${centerY} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${centerY}`

  return <div className="health-gauge-wrap">
    <svg viewBox={`0 0 ${size} ${size / 2 + stroke}`} role="img" aria-label={`Business health score ${normalizedScore} out of 100`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="var(--color-error)"/><stop offset="52%" stopColor="var(--color-warning)"/><stop offset="100%" stopColor="var(--color-success)"/></linearGradient></defs>
      <path d={arc} className="health-gauge-track"/>
      <path d={arc} className="health-gauge-value" stroke={`url(#${gradientId})`} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - normalizedScore / 100)}/>
      <circle cx={endpointX} cy={endpointY} r={stroke / 2 + 2} className="health-gauge-marker"/>
    </svg>
    <div className="health-gauge-label"><strong>{normalizedScore}</strong><span>out of 100</span></div>
  </div>
}
