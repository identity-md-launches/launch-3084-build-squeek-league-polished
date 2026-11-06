import { Check, Moon, RotateCcw } from 'lucide-react';
import { hours, hourLabel, localHour, toggleSlot, type Pick } from '../game';
export function SlotPicker({ pick, onChange, day, disabled = false, id = 'draft' }: { pick: Pick; onChange: (pick: Pick) => void; day: number; disabled?: boolean; id?: string }) {
  return <div className="slot-picker">
    <div className="slot-labels"><span>UTC hour <span className="muted">/ your local time</span></span><span className="selection-count" role="status">{pick.sleep ? 'Sleep call' : `${pick.slots.length} of 3 picked`}</span></div>
    <div className="slot-grid" role="group" aria-label="Choose three UTC hour-slots">
      {hours.map(hour => {
        const selected = !pick.sleep && pick.slots.includes(hour);
        return <button key={hour} type="button" className={`hour-slot ${selected ? 'selected' : ''}`} aria-pressed={selected} aria-label={`${hourLabel(hour)} UTC, ${localHour(day, hour)} local${selected ? ', selected' : ''}`} disabled={disabled} onClick={() => onChange(toggleSlot(pick, hour))} data-hour={hour} data-picker={id}>
          <span className="utc-hour">{String(hour).padStart(2, '0')}{selected && <Check aria-hidden="true" size={12} strokeWidth={3}/>}</span><span className="local-hour">{localHour(day, hour)}</span>
        </button>;
      })}
    </div>
    <div className="slot-options"><button type="button" className={`sleep-button ${pick.sleep ? 'selected' : ''}`} aria-pressed={pick.sleep} disabled={disabled} onClick={() => onChange({ sleep: !pick.sleep, slots: [] })}><Moon size={16}/><span>Sleep call</span>{pick.sleep && <Check size={15}/>}</button><button type="button" className="text-button clear-button" disabled={disabled || (!pick.sleep && !pick.slots.length)} onClick={() => onChange({ slots: [], sleep: false })}><RotateCcw size={14}/> Clear</button></div>
  </div>;
}
