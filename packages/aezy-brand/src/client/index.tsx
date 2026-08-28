import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { HeroBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {
  SidebarBrandMarkOwnerProps,
  SidebarBrandNameOwnerProps,
} from '@deepseek-ai/dsh-client-ui-sidebar/client'

type BrandMarkProps = HeroBrandMarkOwnerProps & SidebarBrandMarkOwnerProps

/** Temporary typographic mark until Aezy has a deliberately designed logo. */
export function AezyBrandMark({ size, className }: BrandMarkProps) {
  return <span
    className={className}
    aria-hidden="true"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      borderRadius: '28%',
      background: 'var(--dsw-alias-brand-primary, #0f1115)',
      color: 'var(--dsw-alias-label-primary-inverted, #ffffff)',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      fontSize: Math.max(11, Math.round(size * 0.48)),
      fontWeight: 700,
      lineHeight: 1,
      letterSpacing: '-0.04em',
      userSelect: 'none',
    }}
  >A</span>
}

/** Plain text name occupant; typography and layout remain owned by the host. */
export function AezyBrandName(_props: SidebarBrandNameOwnerProps) {
  return <span style={{ color: 'inherit', font: 'inherit' }}>Aezy</span>
}

export const inject = ['slots']

/** Fill the three generic rc.2 brand slots without replacing their hosts. */
export function apply(ctx: ClientContext): void {
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', () =>
      ctx.slots.inject('conversation.hero.brand.mark', function* () {
        yield ctx.slots.register({ name: 'sidebar.brand.mark' }, AezyBrandMark)
        yield ctx.slots.register({ name: 'sidebar.brand.name' }, AezyBrandName)
        yield ctx.slots.register({ name: 'conversation.hero.brand.mark' }, AezyBrandMark)
      })))
}
