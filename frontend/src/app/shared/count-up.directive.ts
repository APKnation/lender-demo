import { Directive, ElementRef, effect, inject, input } from '@angular/core';

/**
 * Animates the element's text from 0 (or the previous target) to the given
 * number with an ease-out curve. Writes textContent directly, so it is
 * safe in zoneless Angular (no change detection involved).
 *
 * Usage: <span [appCountUp]="1234" [appCountUpPrefix]="'TZS '">0</span>
 */
@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly appCountUp = input.required<number>();
  readonly appCountUpDuration = input(900);
  readonly appCountUpPrefix = input('');
  readonly appCountUpSuffix = input('');
  readonly appCountUpCompact = input(true);

  private current = 0;
  private raf = 0;
  private readonly locale = new Intl.NumberFormat('en-US');

  constructor() {
    effect(onCleanup => {
      const target = this.appCountUp() || 0;
      this.animateTo(target);
      onCleanup(() => cancelAnimationFrame(this.raf));
    });
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.raf);
    const from = this.current;
    const duration = Math.max(0, this.appCountUpDuration());
    const start = performance.now();

    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      this.current = from + (target - from) * eased;
      this.render(this.current);
      if (t < 1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.current = target;
        this.render(target);
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  private render(value: number): void {
    let text: string;
    if (this.appCountUpCompact() && Math.abs(value) >= 1_000_000) {
      text = `${(value / 1_000_000).toFixed(1)}M`;
    } else if (this.appCountUpCompact() && Math.abs(value) >= 10_000) {
      text = `${(value / 1_000).toFixed(0)}K`;
    } else {
      text = this.locale.format(Math.round(value));
    }
    this.el.nativeElement.textContent = `${this.appCountUpPrefix()}${text}${this.appCountUpSuffix()}`;
  }
}
