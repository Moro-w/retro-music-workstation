import { useRef, useState } from 'react';

interface Props {
  title: string;
  icon: string;
  x: number;
  y: number;
  zIndex: number;
  width: number;
  height: number | 'auto';
  active: boolean;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Window({
  title, icon, x, y, zIndex, width, height, active, onFocus, onClose, children,
}: Props) {
  const [pos, setPos] = useState({ x, y });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const onTitlePointerDown = (e: React.PointerEvent) => {
    onFocus();
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const onMove = (ev: PointerEvent) => {
      if (dragRef.current) {
        setPos({ x: ev.clientX - dragRef.current.dx, y: ev.clientY - dragRef.current.dy });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className={`win95-window absolute ${active ? '' : 'inactive'}`}
      style={{ left: pos.x, top: pos.y, width, height, zIndex }}
      onPointerDown={onFocus}
    >
      <div className="win95-titlebar" onPointerDown={onTitlePointerDown}>
        <span className="truncate">
          <span className="mr-1">{icon}</span>
          {title}
        </span>
        <button className="win95-close" onClick={onClose}>✕</button>
      </div>
      <div className="win95-body">{children}</div>
    </div>
  );
}
