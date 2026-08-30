import { useEffect, useRef } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import {
  CHAT_MIN_RATIO,
  DETAILS_LAYOUT_MIN_PX,
  DETAILS_MAX_RATIO,
  clampDetailsWidth,
  columnLimits,
  parsePixelTracks,
} from '../policy.js'

type DragState = {
  pointerId: number
  originX: number
  baseDetails: number
  sidebar: number
  frameWidth: number
}

function frameOf(anchor: HTMLElement): HTMLElement | null {
  return anchor.closest('[data-shell-overlay]')?.parentElement ?? null
}

function detailsHandle(frame: HTMLElement): HTMLElement | null {
  return frame.querySelector<HTMLElement>('[data-side="details"]')
}

function renderedTracks(frame: HTMLElement) {
  return parsePixelTracks(getComputedStyle(frame).gridTemplateColumns)
}

/**
 * Narrow adapter over DSH's rendered AppFrame. DSH still owns open/close,
 * Session switching, responsive collapse, slots, and the actual panel tree;
 * Aezy only widens the existing details drag range while the panel is open.
 */
export class ProportionalDetailsPolicy {
  private drag: DragState | null = null
  private desiredDetails: number | null = null
  private restoreGrid: string | null = null
  private restoreHandleLeft: string | null = null
  private restoreFrameTransition: string | null = null
  private restoreHandleTransition: string | null = null
  private applying = false
  private frameObserver: MutationObserver | null = null
  private sizeObserver: ResizeObserver | null = null

  constructor(private readonly frame: HTMLElement, private readonly documentRoot: Document = document) {}

  start(): () => void {
    this.frame.dataset.aezyLayoutPolicy = 'proportional-details-v1'
    this.documentRoot.addEventListener('pointerdown', this.onPointerDown, true)
    this.documentRoot.addEventListener('pointermove', this.onPointerMove, true)
    this.documentRoot.addEventListener('pointerup', this.onPointerUp, true)
    this.documentRoot.addEventListener('pointercancel', this.onPointerUp, true)
    this.frameObserver = new MutationObserver(() => { this.reconcile() })
    this.frameObserver.observe(this.frame, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'data-details-collapsed'],
    })
    this.sizeObserver = new ResizeObserver(() => { this.reconcile() })
    this.sizeObserver.observe(this.frame)
    this.reconcile()
    return () => { this.dispose() }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const handle = target.closest<HTMLElement>('[data-side="details"]')
    if (handle === null || !this.frame.contains(handle)) return
    const frameWidth = this.frame.getBoundingClientRect().width
    if (frameWidth < DETAILS_LAYOUT_MIN_PX || this.frame.hasAttribute('data-details-collapsed')) return
    const tracks = renderedTracks(this.frame)
    if (tracks === null || tracks.details <= 0) return
    this.restoreGrid = this.frame.style.gridTemplateColumns
    this.restoreHandleLeft = handle.style.left
    this.restoreFrameTransition = this.frame.style.transition
    this.restoreHandleTransition = handle.style.transition
    this.frame.style.transition = 'none'
    handle.style.transition = 'none'
    this.drag = {
      pointerId: event.pointerId,
      originX: event.clientX,
      baseDetails: tracks.details,
      sidebar: tracks.sidebar,
      frameWidth,
    }
    this.desiredDetails = tracks.details
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag
    if (drag === null || drag.pointerId !== event.pointerId) return
    const requested = drag.baseDetails - (event.clientX - drag.originX)
    this.desiredDetails = clampDetailsWidth(requested, drag.frameWidth, drag.sidebar)
    this.apply(drag.sidebar)
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag === null || this.drag.pointerId !== event.pointerId) return
    this.onPointerMove(event)
    this.drag = null
    this.restoreDragTransitions()
  }

  private reconcile(): void {
    if (this.applying) return
    if (this.frame.getBoundingClientRect().width < DETAILS_LAYOUT_MIN_PX) {
      this.drag = null
      this.desiredDetails = null
      this.restoreGrid = null
      this.restoreHandleLeft = null
      this.restoreDragTransitions()
      this.clearFacts()
      return
    }
    if (this.frame.hasAttribute('data-details-collapsed')) {
      this.desiredDetails = null
      this.restoreGrid = null
      this.restoreHandleLeft = null
      this.restoreDragTransitions()
      this.clearFacts()
      return
    }
    if (this.desiredDetails === null) {
      this.clearFacts()
      return
    }
    const tracks = renderedTracks(this.frame)
    if (tracks !== null) this.apply(tracks.sidebar)
  }

  private apply(sidebarWidth: number): void {
    if (this.desiredDetails === null) return
    const frameWidth = this.frame.getBoundingClientRect().width
    const limits = columnLimits(frameWidth, sidebarWidth)
    const details = clampDetailsWidth(this.desiredDetails, frameWidth, sidebarWidth)
    this.desiredDetails = details
    const grid = `${String(Math.round(limits.sidebar))}px minmax(0, 1fr) ${String(details)}px`
    const handle = detailsHandle(this.frame)
    const left = `${String(Math.round(frameWidth - details))}px`
    this.applying = true
    try {
      if (this.frame.style.gridTemplateColumns !== grid) this.frame.style.gridTemplateColumns = grid
      if (handle !== null && handle.style.left !== left) handle.style.left = left
      this.frame.dataset.aezyChatMinRatio = String(CHAT_MIN_RATIO)
      this.frame.dataset.aezyDetailsMaxRatio = String(DETAILS_MAX_RATIO)
      this.frame.dataset.aezyChatMinPx = String(limits.chatMin)
      this.frame.dataset.aezyDetailsMaxPx = String(limits.detailsMax)
    } finally {
      this.applying = false
    }
  }

  private clearFacts(): void {
    delete this.frame.dataset.aezyChatMinRatio
    delete this.frame.dataset.aezyDetailsMaxRatio
    delete this.frame.dataset.aezyChatMinPx
    delete this.frame.dataset.aezyDetailsMaxPx
  }

  private restoreDragTransitions(): void {
    const handle = detailsHandle(this.frame)
    if (this.restoreFrameTransition !== null) this.frame.style.transition = this.restoreFrameTransition
    if (handle !== null && this.restoreHandleTransition !== null) handle.style.transition = this.restoreHandleTransition
    this.restoreFrameTransition = null
    this.restoreHandleTransition = null
  }

  private dispose(): void {
    this.documentRoot.removeEventListener('pointerdown', this.onPointerDown, true)
    this.documentRoot.removeEventListener('pointermove', this.onPointerMove, true)
    this.documentRoot.removeEventListener('pointerup', this.onPointerUp, true)
    this.documentRoot.removeEventListener('pointercancel', this.onPointerUp, true)
    this.frameObserver?.disconnect()
    this.sizeObserver?.disconnect()
    const handle = detailsHandle(this.frame)
    this.restoreDragTransitions()
    if (this.restoreGrid !== null) this.frame.style.gridTemplateColumns = this.restoreGrid
    if (handle !== null && this.restoreHandleLeft !== null) handle.style.left = this.restoreHandleLeft
    delete this.frame.dataset.aezyLayoutPolicy
    this.clearFacts()
  }
}

function LayoutPolicyMount() {
  const anchor = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = anchor.current
    const frame = element === null ? null : frameOf(element)
    if (frame === null) return
    return new ProportionalDetailsPolicy(frame).start()
  }, [])
  return <span ref={anchor} hidden data-aezy-layout-policy-mount />
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'aezy-layout-policy',
    order: -100,
  }, LayoutPolicyMount))
}

export default { inject, apply }
